import { useCallback } from "react";
import { clientService } from "../../services/api";
import { rememberReturnedLeadIds } from "./returnedToLeadsStore";

const normalizeReturnedLeadId = (student) =>
  student?.lead_id ??
  student?.lead?.id ??
  student?.lead?._id ??
  student?.leadId ??
  student?.lead?.lead_id;

const emitReturnedToLeads = (leadId) => {
  try {
    window.dispatchEvent(
      new CustomEvent("crm:clientReturnedToLeads", { detail: { leadId } })
    );
  } catch {
    // The server update has already succeeded; an unavailable event target is non-fatal.
  }
};

export default function useEnrollmentUpdates({
  authToken,
  allStudents,
  setAllStudents,
  setCurrentPage,
  fetchEnrolledStudents,
  currentPage,
  setToast,
}) {
  const handleDelete = useCallback(
    async (studentId) => {
      const student = (allStudents || []).find((item) => String(item.id) === String(studentId));
      const leadId = normalizeReturnedLeadId(student);
      if (leadId === null || leadId === undefined) {
        setToast({ show: true, message: "Could not find the lead linked to this client.", type: "error" });
        return;
      }

      try {
        await clientService.returnToLeads(leadId, authToken);
        rememberReturnedLeadIds([leadId]);
        setAllStudents((students) =>
          (students || []).filter((item) => String(item.id) !== String(studentId))
        );
        setToast({ show: true, message: "Client returned to Leads", type: "success" });
        emitReturnedToLeads(leadId);

        const remainingOnPage = (allStudents || []).filter(
          (item) => String(item.id) !== String(studentId)
        ).length;
        const pageAfterReturn = currentPage > 1 && remainingOnPage === 0
          ? currentPage - 1
          : currentPage;
        if (pageAfterReturn === currentPage) await fetchEnrolledStudents(currentPage);
        else setCurrentPage(pageAfterReturn);
      } catch (error) {
        setToast({ show: true, message: error.message || "Could not return client to Leads", type: "error" });
      }
    },
    [allStudents, authToken, currentPage, fetchEnrolledStudents, setAllStudents, setCurrentPage, setToast]
  );

  const handleBulkDelete = useCallback(
    async (ids = []) => {
      if (!ids.length) return;
      const selectedIds = new Set(ids.map(String));
      const selected = (allStudents || []).filter((student) => selectedIds.has(String(student.id)));
      const results = await Promise.allSettled(
        selected.map(async (student) => {
          const leadId = normalizeReturnedLeadId(student);
          if (leadId === null || leadId === undefined) {
            throw new Error(`Could not find the lead linked to client ${student.id}.`);
          }
          await clientService.returnToLeads(leadId, authToken);
          return { clientId: student.id, leadId };
        })
      );

      const returned = results
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);
      const returnedClientIds = new Set(returned.map(({ clientId }) => String(clientId)));
      const failedCount = results.length - returned.length;

      if (returned.length) {
        rememberReturnedLeadIds(returned.map(({ leadId }) => leadId));
        setAllStudents((students) =>
          (students || []).filter((student) => !returnedClientIds.has(String(student.id)))
        );
        returned.forEach(({ leadId }) => emitReturnedToLeads(leadId));

        const remainingOnPage = (allStudents || []).filter(
          (student) => !returnedClientIds.has(String(student.id))
        ).length;
        const pageAfterReturn = currentPage > 1 && remainingOnPage === 0
          ? currentPage - 1
          : currentPage;
        if (pageAfterReturn === currentPage) await fetchEnrolledStudents(currentPage);
        else setCurrentPage(pageAfterReturn);
      }

      setToast({
        show: true,
        message: failedCount
          ? `${returned.length} client(s) returned to Leads; ${failedCount} could not be moved.`
          : `${returned.length} client(s) returned to Leads`,
        type: failedCount && !returned.length ? "error" : "success",
      });
    },
    [allStudents, authToken, currentPage, fetchEnrolledStudents, setAllStudents, setCurrentPage, setToast]
  );

  return { handleDelete, handleBulkDelete };
}
