"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createInvoiceAction, updateInvoiceAction } from "@/app/actions/invoices";
import { Field, FormGrid } from "@/components/page-header";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SUPPORTED_CURRENCIES, formatMoney } from "@/lib/currency";
import { bookToBaseCurrency, toMinorUnits } from "@/lib/money";
import { INVOICE_STATUSES, type InvoiceStatus } from "@/types";

export function InvoiceForm({
  organisations,
  branches,
  projects,
  defaultOrganisationId,
  invoice,
}: {
  organisations: { id: number; name: string; currency: string }[];
  branches: { id: number; name: string; organisationId: number }[];
  projects: { id: number; name: string; branchId: number; organisationId: number }[];
  defaultOrganisationId: number | null;
  invoice?: {
    id: number;
    invoiceNumber: string;
    organisationId: number;
    branchId: number | null;
    projectId: number | null;
    description: string;
    currency: string;
    originalAmountMajor: string;
    exchangeRate: string;
    invoiceDate: string;
    dueDate: string | null;
    status: InvoiceStatus;
  };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [organisationId, setOrganisationId] = useState(
    invoice?.organisationId ?? defaultOrganisationId ?? organisations[0]?.id ?? 0,
  );
  const baseCurrency =
    organisations.find((org) => org.id === organisationId)?.currency ??
    organisations[0]?.currency ??
    "USD";
  const [branchId, setBranchId] = useState(invoice?.branchId ? String(invoice.branchId) : "");
  const [projectId, setProjectId] = useState(invoice?.projectId ? String(invoice.projectId) : "");
  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoiceNumber ?? "");
  const [description, setDescription] = useState(invoice?.description ?? "");
  const [txnCurrency, setTxnCurrency] = useState(invoice?.currency ?? baseCurrency);
  const [originalAmountMajor, setOriginalAmountMajor] = useState(
    invoice?.originalAmountMajor ?? "",
  );
  const [exchangeRate, setExchangeRate] = useState(invoice?.exchangeRate ?? "1");
  const [invoiceDate, setInvoiceDate] = useState(invoice?.invoiceDate ?? "");
  const [dueDate, setDueDate] = useState(invoice?.dueDate ?? "");
  const [status, setStatus] = useState<InvoiceStatus>(invoice?.status ?? "DRAFT");

  const orgBranches = branches.filter((branch) => branch.organisationId === organisationId);
  const orgProjects = projects.filter((project) => {
    if (project.organisationId !== organisationId) return false;
    if (branchId && project.branchId !== Number(branchId)) return false;
    return true;
  });
  const needsRate = txnCurrency.toUpperCase() !== baseCurrency.toUpperCase();

  const bookedMinor = useMemo(() => {
    try {
      const original = toMinorUnits(originalAmountMajor || "0");
      if (!needsRate) return original;
      return bookToBaseCurrency(original, exchangeRate || "0");
    } catch {
      return 0n;
    }
  }, [originalAmountMajor, exchangeRate, needsRate]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (needsRate && (!exchangeRate || Number(exchangeRate) <= 0)) {
      toast.error("Enter a positive exchange rate to book into the organisation currency");
      return;
    }
    setPending(true);
    const payload = {
      invoiceNumber,
      organisationId,
      branchId: branchId ? Number(branchId) : null,
      projectId: projectId ? Number(projectId) : null,
      description,
      currency: txnCurrency,
      originalAmountMajor,
      exchangeRate: needsRate ? exchangeRate : "1",
      invoiceDate,
      dueDate: dueDate || null,
      status,
    };
    const result = invoice
      ? await updateInvoiceAction(invoice.id, payload)
      : await createInvoiceAction(payload);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(invoice ? "Invoice updated" : "Invoice created");
    router.push("/invoices");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-4">
      <FormGrid>
        <Field label="Invoice number">
          <Input value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} required />
        </Field>
        <Field label="Status">
          <NativeSelect value={status} onChange={(event) => setStatus(event.target.value as InvoiceStatus)}>
            {INVOICE_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Organisation">
          <NativeSelect
            value={organisationId}
            onChange={(event) => {
              const nextId = Number(event.target.value);
              setOrganisationId(nextId);
              setBranchId("");
              setProjectId("");
              const nextBase =
                organisations.find((org) => org.id === nextId)?.currency ?? baseCurrency;
              if (txnCurrency === baseCurrency) {
                setTxnCurrency(nextBase);
                setExchangeRate("1");
              }
            }}
          >
            {organisations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name} ({org.currency})
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Branch (optional)">
          <NativeSelect
            value={branchId}
            onChange={(event) => {
              setBranchId(event.target.value);
              setProjectId("");
            }}
          >
            <option value="">Organisation invoice</option>
            {orgBranches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Project (optional)">
          <NativeSelect value={projectId} onChange={(event) => setProjectId(event.target.value)} disabled={!branchId}>
            <option value="">No project</option>
            {orgProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Invoice currency">
          <NativeSelect
            value={txnCurrency}
            onChange={(event) => {
              const next = event.target.value;
              setTxnCurrency(next);
              if (next.toUpperCase() === baseCurrency.toUpperCase()) {
                setExchangeRate("1");
              }
            }}
            required
          >
            {SUPPORTED_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={`Amount (${txnCurrency})`}>
          <Input
            value={originalAmountMajor}
            onChange={(event) => setOriginalAmountMajor(event.target.value)}
            required
          />
        </Field>
        {needsRate ? (
          <Field
            label={`Exchange rate (${baseCurrency} per 1 ${txnCurrency})`}
            className="sm:col-span-2"
          >
            <Input
              value={exchangeRate}
              onChange={(event) => setExchangeRate(event.target.value)}
              placeholder="e.g. 0.012"
              required
            />
            <span className="text-xs font-normal text-muted-foreground">
              Booked revenue (P&amp;L): {formatMoney(bookedMinor, baseCurrency)}
            </span>
          </Field>
        ) : (
          <Field label={`Booked amount (${baseCurrency})`}>
            <Input value={formatMoney(bookedMinor, baseCurrency)} disabled />
          </Field>
        )}
        <Field label="Invoice date">
          <Input type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} required />
        </Field>
        <Field label="Due date">
          <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} required />
        </Field>
      </FormGrid>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
