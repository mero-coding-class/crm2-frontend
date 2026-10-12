// src/pages/Reports.jsx

import React, { useState, useEffect, useCallback } from "react";
import Loader from "../components/common/Loader";
import { PDFDownloadLink } from "@react-pdf/renderer";
import ReportDocument from "../components/ReportDocument";
import DelayedLoader from "../components/common/DelayedLoader";
import { useAuth } from "../context/AuthContext.jsx";
import { leadService } from "../services/api";

// Display helper
const formatDate = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
};

// Columns for the Converted Students table
const convertedStudentsTableColumns = [
  { header: "Name", accessor: "studentName" },
  { header: "Parents", accessor: "parentsName" },
  { header: "Email", accessor: "email" },
  { header: "Phone", accessor: "phone" },
  { header: "WhatsApp", accessor: "contactWhatsapp" },
  { header: "Age/Grade", accessor: "ageGrade" },
  { header: "Course", accessor: "course" },
  { header: "Source", accessor: "source" },
  { header: "Add Date", accessor: "addDate" },
  { header: "Recent Call", accessor: "recentCall" },
  { header: "Next Call", accessor: "nextCall" },
  { header: "Status", accessor: "status" },
  { header: "Address", accessor: "address" },
  { header: "City", accessor: "city" },
  { header: "County", accessor: "county" },
  { header: "Post Code", accessor: "postCode" },
  { header: "Class Type", accessor: "classType" },
  { header: "Value", accessor: "value" },
  { header: "Adset Name", accessor: "adsetName" },
  { header: "Remarks", accessor: "remarks" },
  { header: "Shift", accessor: "shift" },
  { header: "Payment Type", accessor: "paymentType" },
  { header: "Device", accessor: "device" },
  { header: "Course Type", accessor: "courseType" },
  { header: "Prev Coding Exp", accessor: "previousCodingExp" },
  { header: "Workshop Batch", accessor: "workshopBatch" },
];

const Reports = () => {
  const { authToken } = useAuth();

  const [allLeads, setAllLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [filterType, setFilterType] = useState("none"); // 'none' | 'dateRange'
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Computed report data
  const [filteredReportData, setFilteredReportData] = useState(null);

  // Load real leads from API
  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!authToken) throw new Error("You are not logged in.");
        const leads = await leadService.getLeads(authToken);
        setAllLeads(Array.isArray(leads) ? leads : []);
      } catch (e) {
        setError(e.message || "Failed to fetch leads");
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, [authToken]);

  // Build the report from current leads + filters
  const generateReportData = useCallback(() => {
    let leadsToProcess = allLeads;

    // Date range filter (by addDate)
    if (filterType === "dateRange" && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      leadsToProcess = leadsToProcess.filter((lead) => {
        const d = new Date(lead.addDate);
        return !isNaN(d.getTime()) && d >= start && d <= end;
      });
    }

    // Stats
    let total = 0;
    let lost = 0;
    let active = 0;
    let converted = 0;

    const convertedStudents = [];

    leadsToProcess.forEach((lead) => {
      total++;
      const st = (lead.status || "").trim();
      if (st === "Lost") lost++;
      else if (st === "Active") active++;
      else if (st === "Converted") {
        converted++;
        // Prepare a rich row for table/PDF
        convertedStudents.push({
          _id: lead._id,
          studentName: lead.studentName || "",
          parentsName: lead.parentsName || "",
          email: lead.email || "",
          phone: lead.phone || "",
          contactWhatsapp: lead.contactWhatsapp || "",
          ageGrade: `${lead.age || ""}${lead.age || lead.grade ? "/" : ""}${lead.grade || ""
            }`,
          course: lead.courseName || lead.course || "", // show string if possible
          source: lead.source || "",
          addDate: formatDate(lead.addDate),
          recentCall: formatDate(lead.recentCall),
          nextCall: formatDate(lead.nextCall),
          status: st || "",
          address: lead.permanentAddress || "",
          city: lead.city || "",
          county: lead.county || "",
          postCode: lead.postCode || "",
          classType: lead.classType || "",
          value: lead.value || "",
          adsetName: lead.adsetName || "",
          remarks: lead.remarks || "",
          shift: lead.shift || "",
          paymentType: lead.paymentType || "",
          device: lead.device || "",
          courseType: lead.classType || "", // alias to fit column
          previousCodingExp: lead.previousCodingExp || "",
          workshopBatch: lead.workshopBatch || "",
        });
      }
    });

    const missed = Math.max(0, total - (lost + active + converted));

    return {
      totalLeads: total,
      lostLeads: lost,
      activeLeads: active,
      convertedLeads: converted,
      missedLeads: missed,
      convertedStudentsList: convertedStudents,
    };
  }, [allLeads, filterType, startDate, endDate]);

  const handleGenerateReport = () => {
    setFilteredReportData(generateReportData());
  };

  // Initial report build
  useEffect(() => {
    if (allLeads.length > 0 && !filteredReportData) {
      handleGenerateReport();
    }
  }, [allLeads, filteredReportData]);

  if (loading)
    return <DelayedLoader message="Loading reports..." minMs={2000} />;

  if (error)
    return (
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-[16px] font-[600] text-slate-900 mb-1">Failed to load reports</h3>
          <p className="text-[13px] text-slate-500 mb-4">{error}</p>
        </div>
      </div>
    );

  if (!filteredReportData) return <Loader />;

  return (
    <div className="bg-[#F8FAFC] min-h-full">
      {/* Page header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <h1 className="text-[20px] font-[600] leading-[28px] tracking-[-0.015em] text-slate-900">Reports</h1>
        <p className="text-[13px] text-slate-500 leading-[18px] mt-0.5">Generate and export CRM analytics reports</p>
      </div>
      <div className="p-6">
        {/* Filters Card */}
        <div className="bg-white rounded-[12px] border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-[8px] bg-[#EDF2FC] text-[#294998] flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[15px] font-[600] text-slate-900 tracking-[-0.01em]">Filter Report Data</h2>
              <p className="text-[12px] text-slate-400 mt-0.5">Select a date range or view all-time data</p>
            </div>
            <button
              onClick={handleGenerateReport}
              className="h-9 px-4 bg-[#294998] hover:bg-[#1E3776] text-white text-[13px] font-[500] rounded-[8px] shadow-sm transition-colors flex items-center gap-2 shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generate Report
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-5">
            <button
              onClick={() => setFilterType("none")}
              className={`px-4 py-2 rounded-[8px] text-[13px] font-[500] transition-colors ${filterType === "none"
                  ? "bg-[#294998] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
            >
              All Time
            </button>
            <button
              onClick={() => setFilterType("dateRange")}
              className={`px-4 py-2 rounded-[8px] text-[13px] font-[500] transition-colors ${filterType === "dateRange"
                  ? "bg-[#294998] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
            >
              Date Range
            </button>
          </div>

          {filterType === "dateRange" && (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-10 px-3.5 text-[13px] rounded-[10px] bg-slate-100/70 hover:bg-slate-100 border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all text-slate-800"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider mb-1.5">
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-10 px-3.5 text-[13px] rounded-[10px] bg-slate-100/70 hover:bg-slate-100 border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all text-slate-800"
                />
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <ReportCard title="Total Leads" value={filteredReportData.totalLeads} colorClass="text-[#294998]" bgClass="bg-[#EDF2FC]" />
          <ReportCard title="Active Leads" value={filteredReportData.activeLeads} colorClass="text-[#B8740C]" bgClass="bg-[#FEF7EB]" />
          <ReportCard title="Converted" value={filteredReportData.convertedLeads} colorClass="text-emerald-600" bgClass="bg-emerald-50" />
          <ReportCard title="Lost Leads" value={filteredReportData.lostLeads} colorClass="text-rose-600" bgClass="bg-rose-50" />
          <ReportCard title="Uncategorized" value={filteredReportData.missedLeads} colorClass="text-slate-500" bgClass="bg-slate-100" />
        </div>

        {/* PDF Download */}
        <div className="bg-white rounded-[12px] border border-slate-200 p-5 mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-[14px] font-[600] text-slate-900">Export Report PDF</h2>
            <p className="text-[12px] text-slate-400 mt-0.5">
              {filterType === "dateRange" && startDate && endDate
                ? `Filtered: ${formatDate(startDate)} → ${formatDate(endDate)}`
                : "All-time data"}
            </p>
          </div>
          <PDFDownloadLink
            document={
              <ReportDocument
                reportData={filteredReportData}
                filterCriteria={{ filterType, startDate, endDate }}
              />
            }
            fileName={`CRM_Report_${filterType === "dateRange"
                ? `${formatDate(startDate)}_to_${formatDate(endDate)}`
                : "AllTime"
              }.pdf`}
          >
            {({ loading: pdfLoading }) =>
              pdfLoading ? (
                <button disabled className="h-9 px-4 bg-slate-100 text-slate-400 text-[13px] font-[500] rounded-[8px] cursor-not-allowed flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Preparing…
                </button>
              ) : (
                <button className="h-9 px-4 bg-[#294998] hover:bg-[#1E3776] text-white text-[13px] font-[500] rounded-[8px] shadow-sm transition-colors flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </button>
              )
            }
          </PDFDownloadLink>
        </div>

        {/* Converted Students Table */}
        <div className="bg-white rounded-[12px] border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-[14px] font-[600] text-slate-900 tracking-[-0.005em]">
              Converted Leads
              <span className="ml-2 px-2 py-0.5 text-[11px] font-[600] bg-emerald-50 text-emerald-700 rounded-full ring-1 ring-emerald-200">
                {filteredReportData.convertedStudentsList.length}
              </span>
            </h2>
            <p className="text-[12px] text-slate-400 mt-0.5">
              {filterType === "dateRange" && startDate && endDate
                ? `From ${formatDate(startDate)} to ${formatDate(endDate)}`
                : "All time"}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-100">
                  {convertedStudentsTableColumns.map((col, idx) => (
                    <th
                      key={col.accessor || idx}
                      className="px-4 py-3 text-left text-[11px] font-[600] text-slate-400 uppercase tracking-[0.05em] whitespace-nowrap"
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredReportData.convertedStudentsList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={convertedStudentsTableColumns.length}
                      className="px-4 py-12 text-center text-[13px] text-slate-400"
                    >
                      No converted leads found for the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredReportData.convertedStudentsList.map((student) => (
                    <tr key={student._id} className="hover:bg-slate-50 transition-colors">
                      {convertedStudentsTableColumns.map((col, idx) => (
                        <td
                          key={col.accessor + idx}
                          className="px-4 py-3 whitespace-nowrap text-slate-700"
                        >
                          {student[col.accessor] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>{/* end p-6 */}
    </div>
  );
};

const ReportCard = ({ title, value, colorClass, bgClass }) => (
  <div className="bg-white rounded-[12px] border border-slate-200 p-5 hover:border-slate-300 transition-colors">
    <p className="text-[11px] font-[600] text-slate-400 uppercase tracking-[0.05em] mb-2">{title}</p>
    <p className={`text-[32px] font-[700] tracking-[-0.02em] tabular-nums ${colorClass || "text-slate-900"}`}>{value ?? 0}</p>
  </div>
);

export default Reports;
