import React, { useEffect, useState } from "react";
import { clientService } from "../services/api.js";
import ReadOnlyRecordModal from "./common/ReadOnlyRecordModal.jsx";

const money = (value) => value === null || value === undefined ? "—" : `NPR ${Number(value).toLocaleString("en-NP")}`;
const date = (value) => value ? new Date(value).toLocaleDateString("en-NP") : "—";

export default function ClientDetailsModal({ client, authToken, onClose }) {
  const [record, setRecord] = useState(client || {});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    clientService.getClient(client.id, authToken)
      .then((data) => { if (!cancelled) setRecord(data); })
      .catch((loadError) => { if (!cancelled) setError(loadError.message || "Could not load client details."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [client.id, authToken]);

  const classes = (record.included_classes || []).map((item) => item.class_name || item.name).filter(Boolean);
  const sections = [
    { title: "Institution and package", fields: [
      ["System ID", record.system_id], ["School name", record.school_name],
      ["District", record.district], ["Municipality", record.municipality],
      ["Package", record.package_name], ["Syllabus", record.syllabus_name],
      ["Included classes", classes], ["Classes per week", record.classes_per_week],
      ["Exams count", record.exams_count], ["Events count", record.events_count],
    ] },
    { title: "Principal", fields: [
      ["Name", record.principal_name], ["Phone", record.principal_number], ["Email", record.principal_email],
    ] },
    { title: "Main contact", fields: [
      ["Name", record.contact_name], ["Phone", record.contact_number], ["Email", record.contact_email],
    ] },
    { title: "Agreement", fields: [
      ["MOU start", date(record.mou_start)], ["MOU end", date(record.mou_end)],
      ["Agreed price", money(record.agreed_price)], ["Pricing basis", record.pricing_basis],
      ["Enrolled at", date(record.enrolled_at)], ["Enrolled by", record.enrolled_by_name],
    ] },
    { title: "Assignments", fields: [
      ["Client Academic Assignee", record.assigned_to_name],
      ["Academic Counsellor", record.academic_counsellor_name],
      ["MCC representative", record.mcc_rep_name],
    ] },
    ...(record.contracts?.length ? [{ title: "Contract history", fields: record.contracts.map((contract) => [
      `${date(contract.start_date)} – ${date(contract.end_date)}`,
      `${money(contract.value)} · ${contract.state}${contract.signed_date ? ` · signed ${date(contract.signed_date)}` : ""}`,
    ]) }] : []),
  ];

  return (
    <ReadOnlyRecordModal
      title={record.school_name || client.school_name || "Client details"}
      subtitle={record.system_id || client.system_id}
      sections={sections}
      loading={loading}
      error={error}
      onClose={onClose}
    />
  );
}
