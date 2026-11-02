import React, { useEffect, useState } from "react";
import { leadService } from "../services/api.js";
import ReadOnlyRecordModal from "./common/ReadOnlyRecordModal.jsx";

export default function LeadDetailsModal({ lead, authToken, onClose }) {
  const [record, setRecord] = useState(lead || {});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    leadService.getLead(lead.id, authToken)
      .then((data) => { if (!cancelled) setRecord(data); })
      .catch((loadError) => { if (!cancelled) setError(loadError.message || "Could not load lead details."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [lead.id, authToken]);

  const sections = [
    { title: "Institution", fields: [
      ["System ID", record.system_id], ["School name", record.school_name],
      ["District", record.district], ["Municipality", record.municipality], ["Address", record.address],
    ] },
    { title: "Contact details", fields: [
      ["Contact person", record.contact_person], ["Contact number", record.contact_number],
      ["Alternate contact", record.alt_contact_person], ["Alternate number", record.alt_number],
      ["Landline", record.landline], ["Email", record.email], ["Social media", record.social_media],
    ] },
    { title: "Pipeline", fields: [
      ["Source", record.source], ["Class interest", record.course_interest],
      ["Sub-status", record.sub_status], ["Approval", record.approval],
      ["Approval reason", record.approval_reason], ["Proposal sent", record.proposal_status],
      ["Demo scheduled", record.demo_scheduled], ["Lead status", record.status],
      ["Next-year probability", record.next_year_probability],
    ] },
    { title: "Assignment and history", fields: [
      ["Lead owner", record.owner_username], ["Call assignee", record.call_assignee_username],
      ["Created by", record.created_by_username], ["Created", record.created_at],
      ["Last updated", record.updated_at], ["Archived", record.archived],
      ["Archive reason", record.archive_reason], ["Approved by", record.approved_by_username],
      ["Approved at", record.approved_at],
    ] },
  ];

  return (
    <ReadOnlyRecordModal
      title={record.school_name || lead.school_name || "Lead details"}
      subtitle={record.system_id || lead.system_id}
      sections={sections}
      loading={loading}
      error={error}
      onClose={onClose}
    />
  );
}
