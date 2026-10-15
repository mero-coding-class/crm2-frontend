import { useCallback } from "react";
import { BASE_URL } from "../../config";
import { apiFetch } from "../../services/api";

// Use /api/clients/ — the new backend route (replaced old /enrollments/)
const ENROLLMENTS_API_BASE = `${BASE_URL}/clients/`;

export default function useEnrollmentUpdates({
  authToken,
  teachers,
  allStudents,
  setAllStudents,
  fetchEnrolledStudents,
  currentPage,
  setToast,
  setError,
}) {
  // Instant field update (sends PATCH to backend immediately)
  const handleUpdateField = useCallback(
    async (studentId, field, value) => {
      const prevStudents = (allStudents || []).slice();

      const paymentFields = new Set([
        "total_payment",
        "first_installment",
        "second_installment",
        "third_installment",
      ]);

      let backendField = field;
      if (field && field.startsWith("lead.")) {
        backendField = field.replace("lead.", "");
      }
      if (["batch_name", "batchName", "batchname"].includes(backendField)) {
        backendField = "batchname";
      }
      if (
        [
          "courseDuration",
          "course_duration",
          "courseDuration",
          "courseduration",
        ].includes(backendField)
      ) {
        backendField = "course_duration";
      }
      if (
        ["assigned_teacher_name", "assignedTeacherName"].includes(
          backendField
        )
      ) {
        backendField = "assigned_teacher";
      }

      try {
        // Optimistic update
        setAllStudents((prev) =>
          (prev || []).map((s) => {
            if (String(s.id) !== String(studentId)) return s;
            const next = JSON.parse(JSON.stringify(s || {}));
            if (field === null && value && typeof value === "object") {
              for (const [k, v] of Object.entries(value || {})) {
                if (k === "lead" && typeof v === "object") {
                  next.lead = { ...(next.lead || {}), ...v };
                } else if (k === "batch_name") {
                  next.batchname = v;
                } else {
                  if (
                    [
                      "total_payment",
                      "first_installment",
                      "second_installment",
                      "third_installment",
                    ].includes(k) &&
                    (typeof v === "string" || typeof v === "number")
                  ) {
                    const n = Number(v);
                    next[k] = Number.isFinite(n) ? n : v;
                  } else {
                    next[k] = v;
                  }
                }
              }
            } else {
              if (field && field.startsWith("lead.")) {
                const leadKey = backendField;
                next.lead = { ...(next.lead || {}) };
                next.lead[leadKey] = value;
              } else {
                next[backendField] = value;
              }
            }
            return next;
          })
        );

        let payload = {};
        if (field === null && value && typeof value === "object") {
          const obj = { ...(value || {}) };
          const current = prevStudents.find(
            (s) => String(s.id) === String(studentId)
          );
          // Resolve lead id from multiple possible shapes
          const leadId =
            (current &&
              (current.lead?.id ??
                current.lead?._id ??
                current.leadId ??
                current.lead?.lead_id)) ||
            null;
          if (obj.batch_name && !obj.batchname) obj.batchname = obj.batch_name;

          const enrollmentAllowed = new Set([
            "course",
            "batchname",
            "assigned_teacher",
            "starting_date",
            "total_payment",
            "second_installment",
            "third_installment",
            "last_pay_date",
            "next_pay_date",
            "payment_completed",
            "remarks",
            // allow invoice fields for clear via JSON (null)
            "second_invoice",
            "third_invoice",
          ]);
          const enrollmentPayload = {};
          for (const [k, vRaw] of Object.entries(obj)) {
            if (!enrollmentAllowed.has(k)) continue;
            if (vRaw === undefined) continue;
            let v = vRaw;
            if (k === "course") {
              if (v && typeof v === "object" && v.id !== undefined) v = v.id;
              if (typeof v === "string" && /^\d+$/.test(v)) v = parseInt(v, 10);
            }
            if (["total_payment", "second_installment", "third_installment"].includes(k)) {
              if (v === null || v === "") v = null;
              else {
                const n = Number(v);
                v = Number.isFinite(n) ? n : null;
              }
            }
            if (k === "assigned_teacher" && typeof v === "object") {
              if (v.id !== undefined) v = v.id;
            }
            if (k === "payment_completed") {
              if (typeof v === "string") {
                const s = v.toLowerCase();
                v = s === "true" || s === "yes" || s === "1";
              } else v = !!v;
            }
            if (["starting_date", "last_pay_date", "next_pay_date"].includes(k) && v) {
              try { v = String(v).split("T")[0]; } catch {}
            }
            enrollmentPayload[k] = v;
          }

          const paymentKeys = [
            "total_payment",
            "second_installment",
            "third_installment",
            "payment_completed",
          ];
          if (paymentKeys.some((k) => Object.prototype.hasOwnProperty.call(enrollmentPayload, k))) {
            const today = new Date().toISOString().split("T")[0];
            if (!enrollmentPayload.last_pay_date) enrollmentPayload.last_pay_date = today;
          }

          const leadAllowed = new Set([
            "student_name",
            "parents_name",
            "email",
            "phone_number",
            "whatsapp_number",
            "grade",
            "source",
            "class_type",
            "lead_type",
            "shift",
            "previous_coding_experience",
            "last_call",
            "next_call",
            "value",
            "adset_name",
            "course_duration",
            "payment_type",
            "device",
            "school_college_name",
            "address_line_1",
            "address_line_2",
            "city",
            "country",
            "county",
            "post_code",
            "scheduled_taken",
            "first_installment",
            "remarks",
          ]);
          const leadPayload = {};
          const leadSrc = { ...(obj.lead || {}), ...obj };
          for (const [k, vRaw] of Object.entries(leadSrc)) {
            if (!leadAllowed.has(k)) continue;
            if (vRaw === undefined) continue;
            let v = vRaw;
            if (k === "scheduled_taken") {
              const s = String(v).trim().toLowerCase();
              if (s === "true" || s === "yes") v = "Yes";
              else if (s === "false" || s === "no") v = "No";
            }
            if (k === "first_installment") {
              if (v === null || v === "") v = null;
              else {
                const n = Number(v);
                v = Number.isFinite(n) ? n : v;
              }
            }
            leadPayload[k] = v;
          }

          const hasSecondFile = value && value.second_invoice_file instanceof File;
          const hasThirdFile = value && value.third_invoice_file instanceof File;
          const hasInvoiceFiles = hasSecondFile || hasThirdFile;
          const removeSecond = value && value.second_invoice_remove === true;
          const removeThird = value && value.third_invoice_remove === true;
          if (removeSecond) enrollmentPayload.second_invoice = null;
          if (removeThird) enrollmentPayload.third_invoice = null;

          const hasFirstFile = value && value.first_invoice_file instanceof File;
          const removeFirst = value && value.first_invoice_remove === true;

          let enrollmentRespJson = null;
          try {
            const enrollUrl = `${ENROLLMENTS_API_BASE}${studentId}/`;
            let resp;
            const hasEnrollmentChanges = Object.keys(enrollmentPayload).length > 0;
            if (hasInvoiceFiles) {
              const fd = new FormData();
              for (const [k, v] of Object.entries(enrollmentPayload)) {
                if (v === undefined || v === null) continue;
                fd.append(k, typeof v === "object" ? JSON.stringify(v) : String(v));
              }
              if (hasSecondFile) fd.append("second_invoice", value.second_invoice_file);
              if (hasThirdFile) fd.append("third_invoice", value.third_invoice_file);
              resp = await apiFetch(enrollUrl, {
                method: "PATCH",
                headers: { Authorization: `Token ${authToken}` },
                body: fd,
                credentials: "include",
              });
            } else if (hasEnrollmentChanges) {
              resp = await apiFetch(enrollUrl, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Token ${authToken}`,
                },
                body: JSON.stringify(enrollmentPayload),
                credentials: "include",
              });
            } else {
              resp = null;
            }
            if (resp && !resp.ok) {
              let t = await resp.text();
              let d = {};
              try { d = JSON.parse(t); } catch { d = { detail: t }; }
              setAllStudents(prevStudents);
              setError(`Failed to update enrollment: ${d.detail || resp.statusText}`);
              console.error("Enrollment (modal) update error:", { url: enrollUrl, status: resp.status, payload: enrollmentPayload, response: d });
              return;
            }
            enrollmentRespJson = resp ? await resp.json().catch(() => null) : null;
          } catch (e) {
            setAllStudents(prevStudents);
            setError(`Failed to update enrollment: ${e.message || e}`);
            console.error("Enrollment (modal) update exception:", e);
            return;
          }

          let leadRespJson = null;
          // Handle first invoice file upload/clear to Leads endpoint if requested
          if (leadId && (hasFirstFile || removeFirst)) {
            try {
              const leadUrl = `${BASE_URL}/leads/${leadId}/`;
              let lresp;
              if (hasFirstFile) {
                const fd = new FormData();
                fd.append("first_invoice", value.first_invoice_file);
                lresp = await apiFetch(leadUrl, {
                  method: "PATCH",
                  headers: { Authorization: `Token ${authToken}` },
                  body: fd,
                  credentials: "include",
                });
              } else if (removeFirst) {
                lresp = await apiFetch(leadUrl, {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Token ${authToken}`,
                  },
                  body: JSON.stringify({ first_invoice: null }),
                  credentials: "include",
                });
              }
              if (lresp && lresp.ok) {
                leadRespJson = await lresp.json().catch(() => null);
              } else if (lresp) {
                try {
                  const t = await lresp.text();
                  console.warn("Lead first_invoice update failed:", t);
                } catch {}
              }
            } catch (e) {
              console.warn("Lead first_invoice update exception (non-blocking)", e);
            }
          }

          if (leadId && Object.keys(leadPayload).length > 0) {
            try {
              const leadUrl = `${BASE_URL}/leads/${leadId}/`;
              const lresp = await apiFetch(leadUrl, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Token ${authToken}`,
                },
                body: JSON.stringify(leadPayload),
                credentials: "include",
              });
              if (lresp.ok) {
                leadRespJson = await lresp.json().catch(() => null);
              } else {
                let lt = await lresp.text();
                let ld = {};
                try { ld = JSON.parse(lt); } catch { ld = { detail: lt }; }
                console.warn("Lead (modal) patch failed (non-blocking):", { url: leadUrl, status: lresp.status, payload: leadPayload, response: ld });
              }
            } catch (e) {
              console.warn("Lead (modal) patch exception (non-blocking)", e);
            }
          }

          if (enrollmentRespJson || leadRespJson) {
            setAllStudents((prev) =>
              (prev || []).map((s) => {
                if (String(s.id) !== String(studentId)) return s;
                let merged = { ...s };
                if (enrollmentRespJson) {
                  merged = {
                    ...merged,
                    ...enrollmentRespJson,
                    lead: { ...(merged.lead || {}), ...(enrollmentRespJson.lead || {}) },
                  };
                }
                if (leadRespJson) {
                  merged = { ...merged, lead: { ...(merged.lead || {}), ...(leadRespJson || {}) } };
                }
                return merged;
              })
            );
          }

          try {
            if (enrollmentRespJson) {
              window.dispatchEvent(new CustomEvent("crm:enrollmentUpdated", { detail: { enrollment: enrollmentRespJson } }));
            }
            if (leadRespJson) {
              window.dispatchEvent(new CustomEvent("crm:leadUpdated", { detail: { lead: leadRespJson } }));
            }
          } catch {}

          setToast({ show: true, message: "Student Information updated successfully", type: "success" });
          setError(null);
          return enrollmentRespJson;
        } else {
          if (field && field.startsWith("lead.")) {
            const leadKey = backendField;
            payload = { lead: { [leadKey]: value } };
          } else {
            payload = { [backendField]: value };
          }

          if (backendField === "assigned_teacher" && value && typeof value === "object") {
            if (value.id !== undefined) payload.assigned_teacher = value.id;
            payload.assigned_teacher_name = value.name || value.label || "";
          }

          if (payload.course && typeof payload.course === "string" && /^\d+$/.test(payload.course)) {
            payload.course = parseInt(payload.course, 10);
          }
          if (paymentFields.has(backendField) && backendField !== "first_installment") {
            const v = payload[backendField];
            if (v == null || v === "") payload[backendField] = null;
            else {
              const n = Number(v);
              payload[backendField] = Number.isFinite(n) ? n : payload[backendField];
            }
          }
          if (backendField === "payment_completed") {
            const val = payload[backendField];
            if (typeof val === "string") {
              const vv = val.toLowerCase();
              payload[backendField] = vv === "true" || vv === "yes" || vv === "1";
            } else {
              payload[backendField] = !!val;
            }
          }
        }

        const todayDate = new Date().toISOString().split("T")[0];
        const paymentChanged =
          backendField === "payment_completed" ||
          paymentFields.has(backendField) ||
          (field === null && value && (paymentFields.has("total_payment") || paymentFields.has("first_installment")));

        const isLeadFirstInstallmentOnly = backendField === "first_installment" && field !== null;
        if (paymentChanged && !isLeadFirstInstallmentOnly) {
          if (
            payload.payment_completed === true ||
            paymentFields.has(backendField) ||
            (field === null && (payload.total_payment || payload.first_installment || payload.second_installment || payload.third_installment))
          ) {
            payload.last_pay_date = payload.last_pay_date || todayDate;
          }
        }

        if (payload && payload.course && typeof payload.course === "object") {
          if (payload.course.id !== undefined) payload.course = payload.course.id;
          else if (payload.course.value !== undefined) payload.course = payload.course.value;
        }
        if (payload && payload.payment_completed !== undefined) {
          if (typeof payload.payment_completed === "string") {
            const v = payload.payment_completed.toLowerCase();
            payload.payment_completed = v === "true" || v === "yes" || v === "1";
          } else {
            payload.payment_completed = !!payload.payment_completed;
          }
        }

        let response;

        try {
          const normalizeYesNo = (v) => {
            if (v === undefined || v === null) return v;
            if (typeof v === "boolean") return v ? "Yes" : "No";
            const s = String(v).trim().toLowerCase();
            if (s === "yes" || s === "true") return "Yes";
            if (s === "no" || s === "false") return "No";
            if (s === "") return null;
            return v ? "Yes" : "No";
          };

          if (payload && payload.scheduled_taken !== undefined) {
            payload.scheduled_taken = normalizeYesNo(payload.scheduled_taken);
          }
          if (payload && payload.lead) {
            if (payload.lead.scheduled_taken !== undefined) {
              payload.lead.scheduled_taken = normalizeYesNo(payload.lead.scheduled_taken);
              if (payload.lead.scheduled_taken !== null && payload.lead.scheduled_taken !== undefined) {
                payload.scheduled_taken = payload.lead.scheduled_taken;
              }
            } else if (payload.lead.demo_scheduled !== undefined) {
              const norm = normalizeYesNo(payload.lead.demo_scheduled);
              payload.lead.scheduled_taken = norm;
              if (norm !== null && norm !== undefined) {
                payload.scheduled_taken = norm;
              }
              delete payload.lead.demo_scheduled;
            }
          }
        } catch (e) {
          console.debug("scheduled_taken normalization failed:", e);
        }

        let method = "PATCH";
        const hasSecondFile = value && value.second_invoice_file instanceof File;
        const hasThirdFile = value && value.third_invoice_file instanceof File;
        const hasInvoiceFiles = hasSecondFile || hasThirdFile;

        if (hasInvoiceFiles) {
          const fd = new FormData();
          for (const [k, v] of Object.entries(payload)) {
            if (v === null || v === undefined) continue;
            if (typeof v === "object") fd.append(k, JSON.stringify(v));
            else fd.append(k, String(v));
          }
          if (hasSecondFile) fd.append("second_invoice", value.second_invoice_file);
          if (hasThirdFile) fd.append("third_invoice", value.third_invoice_file);
          response = await apiFetch(`${ENROLLMENTS_API_BASE}${studentId}/`, {
            method: "PATCH",
            headers: { Authorization: `Token ${authToken}` },
            body: fd,
            credentials: "include",
          });
        } else {
          const currentStudent = allStudents.find((s) => String(s.id) === String(studentId));
          const resolvedLeadId =
            (currentStudent && (currentStudent.lead?.id ?? currentStudent.lead?._id ?? currentStudent.leadId ?? currentStudent.lead?.lead_id)) ||
            null;
          const isLeadField =
            field &&
            (field.startsWith("lead.") ||
              [
                "student_name",
                "parents_name",
                "email",
                "phone_number",
                "age",
                "grade",
                "status",
                "substatus",
                "course_duration",
                "course_type",
                "shift",
                "previous_coding_experience",
                "last_call",
                "next_call",
                "value",
                "adset_name",
                "payment_type",
                "device",
                "school_college_name",
                "remarks",
                "address_line_1",
                "address_line_2",
                "city",
                "country",
                "post_code",
                "source",
                "class_type",
                "lead_type",
                "course",
                "scheduled_taken",
                "whatsapp_number",
                "first_installment",
              ].includes(backendField));

          const enrollmentOnlyFields = [
            "batchname",
            "batch_name",
            "assigned_teacher",
            "assigned_teacher_name",
            "total_payment",
            "second_installment",
            "third_installment",
            "payment_completed",
            "starting_date",
            "last_pay_date",
            "next_pay_date",
            "course",
            "remarks",
          ];

          const isEnrollmentOnlyField = enrollmentOnlyFields.includes(backendField);
          const shouldUseLeadsAPI = isLeadField && !isEnrollmentOnlyField && !!resolvedLeadId;

          if (isLeadField && !resolvedLeadId) {
            setAllStudents(prevStudents);
            setError("Cannot update lead field from enrollment row: missing lead id");
            console.warn("Blocked lead field update due to missing lead id", backendField, { studentId, currentStudent });
            return;
          }

          let apiUrl;
          if (shouldUseLeadsAPI) {
            apiUrl = `${BASE_URL}/leads/${resolvedLeadId}/`;
            if (payload && payload.lead) payload = { ...payload.lead };
            if (backendField === "first_installment") {
              const v = payload.first_installment;
              payload = { first_installment: v == null || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : v };
            }
          } else {
            apiUrl = `${ENROLLMENTS_API_BASE}${studentId}/`;
          }

          response = await apiFetch(apiUrl, {
            method,
            headers: { "Content-Type": "application/json", Authorization: `Token ${authToken}` },
            body: JSON.stringify(payload),
            credentials: "include",
          });
        }

        if (!response.ok) {
          if (
            response.status === 400 &&
            payload &&
            Object.prototype.hasOwnProperty.call(payload, "scheduled_taken") &&
            typeof payload.scheduled_taken === "boolean"
          ) {
            try {
              const retryPayload = { ...payload, scheduled_taken: payload.scheduled_taken ? "Yes" : "No" };
              const retryResp = await apiFetch(typeof apiUrl !== "undefined" ? apiUrl : `${ENROLLMENTS_API_BASE}${studentId}/`, {
                method,
                headers: { "Content-Type": "application/json", Authorization: `Token ${authToken}` },
                body: JSON.stringify(retryPayload),
                credentials: "include",
              });
              if (retryResp.ok) response = retryResp;
            } catch (e) {
              console.debug("scheduled_taken retry failed", e);
            }
          }

          const leadOwnedForbidEnrollFallback = new Set([
            "payment_type",
            "scheduled_taken",
            "course_duration",
            "first_installment",
            "remarks",
          ]);

          if (
            !response.ok &&
            response.status === 400 &&
            payload &&
            Object.prototype.hasOwnProperty.call(payload, "payment_type") &&
            !payload.lead &&
            !(leadOwnedForbidEnrollFallback.has(backendField) || (typeof apiUrl !== "undefined" && apiUrl.includes("/leads/")))
          ) {
            try {
              const retryPayload = { ...payload, lead: { payment_type: payload.payment_type } };
              const retryUrl = typeof apiUrl !== "undefined" ? apiUrl : `${ENROLLMENTS_API_BASE}${studentId}/`;
              const retryResp = await apiFetch(retryUrl, {
                method,
                headers: { "Content-Type": "application/json", Authorization: `Token ${authToken}` },
                body: JSON.stringify(retryPayload),
                credentials: "include",
              });
              if (retryResp.ok) response = retryResp;
            } catch (e) { console.debug("payment_type nested retry failed", e); }
          }

          if (
            !response.ok &&
            response.status === 400 &&
            payload &&
            Object.prototype.hasOwnProperty.call(payload, "course_duration") &&
            !payload.lead &&
            !(leadOwnedForbidEnrollFallback.has(backendField) || (typeof apiUrl !== "undefined" && apiUrl.includes("/leads/")))
          ) {
            try {
              const retryPayload = { ...payload, lead: { course_duration: payload.course_duration } };
              const retryUrl = typeof apiUrl !== "undefined" ? apiUrl : `${ENROLLMENTS_API_BASE}${studentId}/`;
              const retryResp = await apiFetch(retryUrl, {
                method,
                headers: { "Content-Type": "application/json", Authorization: `Token ${authToken}` },
                body: JSON.stringify(retryPayload),
                credentials: "include",
              });
              if (retryResp.ok) response = retryResp;
            } catch (e) { console.debug("course_duration nested retry failed", e); }
          }
        }

        if (!response.ok) {
          let errorText = await response.text();
          let errorData = {};
          try { errorData = JSON.parse(errorText); } catch (e) { errorData = { detail: errorText }; }
          setAllStudents(prevStudents);
          setError(`Failed to update enrollment: ${errorData.detail || response.statusText}`);
          const requestUrl = typeof apiUrl !== "undefined" ? apiUrl : `${ENROLLMENTS_API_BASE}${studentId}/`;
          console.error("Enrollment update error details:", { method, url: requestUrl, payload, status: response.status, response: errorData });
          return;
        }
        const respJson = await response.json().catch(() => null);
        if (respJson) {
          setAllStudents((prev) =>
            (prev || []).map((s) => {
              if (String(s.id) !== String(studentId)) return s;
              if (typeof apiUrl !== "undefined" && apiUrl.includes("/leads/")) {
                return { ...s, lead: { ...(s.lead || {}), ...(respJson || {}) } };
              }
              const merged = { ...s, ...respJson, lead: { ...(s.lead || {}), ...(respJson.lead || {}) } };
              if (respJson.assigned_teacher && !respJson.assigned_teacher_name) {
                try {
                  const match = (teachers || []).find((t) => String(t.id) === String(respJson.assigned_teacher));
                  merged.assigned_teacher_name = match ? match.name : s.assigned_teacher_name;
                } catch (e) { merged.assigned_teacher_name = s.assigned_teacher_name; }
              }
              return merged;
            })
          );

          try {
            window.dispatchEvent(new CustomEvent("crm:enrollmentUpdated", { detail: { enrollment: respJson } }));
            const emittedLead = respJson.lead || (apiUrl.includes("/leads/") ? respJson : null);
            const meta = {
              id: emittedLead?.id || respJson?.id || studentId,
              field_changed: backendField,
              old_value: undefined,
              new_value: undefined,
              lead: emittedLead || undefined,
            };
            try {
              meta.old_value = prevStudents.find((x) => String(x.id) === String(studentId))?.[backendField];
              meta.new_value =
                (apiUrl.includes("/leads/") ? respJson && respJson[backendField] : respJson[backendField]) ??
                (respJson.lead && respJson.lead[backendField]) ??
                payload[backendField] ??
                value;
            } catch (e) {}
            window.dispatchEvent(new CustomEvent("crm:leadUpdated", { detail: meta }));
          } catch (e) {
            console.debug("Failed to emit enrollment/lead updated events", e);
          }
        }

        const fieldDisplayName =
          backendField === "payment_completed"
            ? "Payment Status"
            : backendField === "assigned_teacher"
            ? "Assigned Teacher"
            : backendField === "course_duration"
            ? "Course Duration"
            : backendField === "scheduled_taken"
            ? "Demo Scheduled"
            : backendField === "batchname"
            ? "Batch Name"
            : field === null
            ? "Student Information"
            : backendField.charAt(0).toUpperCase() + backendField.slice(1).replace(/_/g, " ");

        setToast({ show: true, message: `${fieldDisplayName} updated successfully`, type: "success", duration: 3000 });
        setError(null);

        if (field === null && value && Object.prototype.hasOwnProperty.call(value, "first_installment")) {
          try {
            const current = prevStudents.find((s) => String(s.id) === String(studentId));
            const leadId = current?.lead?.id;
            if (leadId !== undefined && leadId !== null) {
              const fi = value.first_installment;
              const body = {
                first_installment:
                  fi === null || fi === "" ? null : Number.isFinite(Number(fi)) ? Number(fi) : fi,
              };
              const leadResp = await apiFetch(`${BASE_URL}/leads/${leadId}/`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Token ${authToken}` },
                body: JSON.stringify(body),
                credentials: "include",
              });
              if (leadResp.ok) {
                const leadJson = await leadResp.json().catch(() => null);
                if (leadJson) {
                  setAllStudents((prev) =>
                    (prev || []).map((s) =>
                      String(s.id) === String(studentId)
                        ? { ...s, first_installment: body.first_installment, lead: { ...(s.lead || {}), ...(leadJson || {}) } }
                        : s
                    )
                  );
                }
              }
            }
          } catch (e) {
            console.debug("Lead first_installment patch failed (non-blocking)", e);
          }
        }
        return respJson;
      } catch (err) {
        try { setAllStudents((prev) => prevStudents || prev); } catch (e) {}
        setError(`Error updating student: ${err.message}`);
        console.error(`Error updating student ${field}:`, err);
      }
    },
    [authToken, teachers, allStudents, fetchEnrolledStudents, currentPage, setAllStudents, setError, setToast]
  );

  const handleUpdatePaymentStatus = useCallback(
    async (studentId, newStatus) => {
      handleUpdateField(studentId, "payment_completed", newStatus);
    },
    [handleUpdateField]
  );

  const handleDelete = useCallback(
    async (studentId) => {
      try {
        // Backend blocks DELETE /clients/* (405) and DELETE /leads/* (405).
        // Delete button is kept in the UI and maps to archiving the
        // associated lead instead (soft-archive, never hard delete).
        const current = (allStudents || []).find((s) => String(s.id) === String(studentId));
        const leadId =
          (current &&
            (current.lead?.id ?? current.lead?._id ?? current.leadId ?? current.lead?.lead_id)) ||
          null;

        // After successful enrollment deletion, move the associated lead to Trash (if any)
        if (leadId !== null && leadId !== undefined) {
          try {
            const trashResp = await apiFetch(`${BASE_URL}/leads/${leadId}/archive/`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Token ${authToken}`,
              },
              body: JSON.stringify({ reason: "Enrollment deleted", next_year_probability: false }),
              credentials: "include",
            });
            if (trashResp.ok || trashResp.status === 400) {
              try {
                const trashed = trashResp.ok ? await trashResp.json().catch(() => null) : null;
                window.dispatchEvent(
                  new CustomEvent("crm:leadMovedToTrash", { detail: { lead: trashed || undefined, leadId } })
                );
                window.dispatchEvent(
                  new CustomEvent("crm:leadArchived", { detail: { leadId } })
                );
              } catch {}
            } else {
              let errorBody = null;
              try { errorBody = await trashResp.json(); } catch (e) { try { errorBody = await trashResp.text(); } catch (e2) { errorBody = null; } }
              const detailMsg = (errorBody && errorBody.detail) || (typeof errorBody === "string" && errorBody) || trashResp.statusText;
              setError(`Failed to archive lead: ${detailMsg}`);
              console.error("Archive error details:", { url: `${BASE_URL}/leads/${leadId}/archive/`, status: trashResp.status, response: errorBody });
              return;
            }
          } catch (e) {
            console.debug("Failed to move lead to archive after enrollment delete (non-blocking)", e);
          }
        }
        // Local-only removal of the enrollment row (backend retains the client record).
        setAllStudents((prev) => prev.filter((s) => s.id !== studentId));
        fetchEnrolledStudents(currentPage);
      } catch (err) {
        console.error("Failed to delete enrollment:", err);
        setError(err.message || "Failed to delete enrollment");
      }
    },
    [authToken, fetchEnrolledStudents, currentPage, setAllStudents, setError]
  );

  const handleBulkDelete = useCallback(
    async (ids = []) => {
      if (!ids || ids.length === 0) return;
      try {
        // Backend blocks DELETE /clients/* and DELETE /leads/* (405).
        // Bulk Delete button maps to archiving each associated lead instead.
        const leadsToTrash = (allStudents || [])
          .filter((s) => (ids || []).some((id) => String(s.id) === String(id)))
          .map((s) => s && (s.lead?.id ?? s.lead?._id ?? s.leadId ?? s.lead?.lead_id))
          .filter((lid) => lid !== null && lid !== undefined);

        await Promise.all(
          leadsToTrash.map((lid) =>
            fetch(`${BASE_URL}/leads/${lid}/archive/`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Token ${authToken}`,
              },
              body: JSON.stringify({ reason: "Bulk enrollment deleted", next_year_probability: false }),
              credentials: "include",
            }).then(async (r) => {
              try {
                if (r.ok || r.status === 400) {
                  const trashed = r.ok ? await r.json().catch(() => null) : null;
                  window.dispatchEvent(
                    new CustomEvent("crm:leadMovedToTrash", { detail: { lead: trashed || undefined, leadId: lid } })
                  );
                  window.dispatchEvent(
                    new CustomEvent("crm:leadArchived", { detail: { leadId: lid } })
                  );
                }
              } catch {}
            })
          )
        );

        setAllStudents((prev) => prev.filter((s) => !ids.includes(s.id)));
        fetchEnrolledStudents(currentPage);
      } catch (err) {
        console.error("Bulk delete failed:", err);
        setError("Failed to delete some enrollments.");
        fetchEnrolledStudents(currentPage);
      }
    },
    [authToken, allStudents, fetchEnrolledStudents, currentPage, setAllStudents, setError]
  );

  return { handleUpdateField, handleUpdatePaymentStatus, handleDelete, handleBulkDelete };
}
