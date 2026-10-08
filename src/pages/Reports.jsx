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
          ageGrade: `${lead.age || ""}${lead.age || lead.grade ? "/" : ""}${
            lead.grade || ""
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
      <div className="text-red-500 p-4 bg-red-100 rounded-md">
        Error: {error}
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
      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-2xl font-bold mb-4">Filter Report Data</h2>

        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              value="none"
              checked={filterType === "none"}
              onChange={() => setFilterType("none")}
              className="form-radio text-indigo-600"
            />
            <span className="text-gray-700">All Time</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              value="dateRange"
              checked={filterType === "dateRange"}
              onChange={() => setFilterType("dateRange")}
              className="form-radio text-indigo-600"
            />
            <span className="text-gray-700">Date Range</span>
          </label>
        </div>

        {filterType === "dateRange" && (
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
            <div>
              <label
                htmlFor="startDate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label
                htmlFor="endDate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        <button
          onClick={handleGenerateReport}
          className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-md shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          Generate Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <ReportCard
          title="Total Leads"
          value={filteredReportData.totalLeads}
          color="bg-blue-500"
        />
        <ReportCard
          title="Active Leads"
          value={filteredReportData.activeLeads}
          color="bg-yellow-500"
        />
        <ReportCard
          title="Converted Leads"
          value={filteredReportData.convertedLeads}
          color="bg-green-500"
        />
        <ReportCard
          title="Lost Leads"
          value={filteredReportData.lostLeads}
          color="bg-red-500"
        />
        <ReportCard
          title="Missed Leads"
          value={filteredReportData.missedLeads}
          color="bg-purple-500"
        />
      </div>

      {/* PDF Download */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Download Report PDF</h2>
        <PDFDownloadLink
          document={
            <ReportDocument
              reportData={filteredReportData}
              filterCriteria={{ filterType, startDate, endDate }}
            />
          }
          fileName={`CRM_Report_${
            filterType === "dateRange"
              ? `${formatDate(startDate)}_to_${formatDate(endDate)}`
              : "AllTime"
          }.pdf`}
        >
          {({ loading }) =>
            loading ? (
              <button className="bg-gray-400 text-white py-2 px-4 rounded-md cursor-not-allowed">
                Preparing PDF...
              </button>
            ) : (
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md shadow">
                Download PDF
              </button>
            )
          }
        </PDFDownloadLink>
      </div>

      {/* Converted Students Table */}
      <h2 className="text-2xl font-bold mb-4">
        Converted Students List (
        {filterType === "dateRange" && startDate && endDate
          ? `From ${formatDate(startDate)} to ${formatDate(endDate)}`
          : "All Time"}
        )
      </h2>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {convertedStudentsTableColumns.map((col, idx) => (
                  <th
                    key={col.accessor || idx}
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReportData.convertedStudentsList.length === 0 ? (
                <tr>
                  <td
                    colSpan={convertedStudentsTableColumns.length}
                    className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500"
                  >
                    No converted students found for the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredReportData.convertedStudentsList.map((student) => (
                  <tr key={student._id}>
                    {convertedStudentsTableColumns.map((col, idx) => (
                      <td
                        key={col.accessor + idx}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                      >
                        {student[col.accessor]}
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

const ReportCard = ({ title, value, color }) => (
  <div className="bg-white rounded-[12px] border border-slate-200 p-5 flex flex-col items-center justify-center hover:border-slate-300 transition-colors">
    <p className="text-[12px] font-[600] text-slate-500 uppercase tracking-[0.04em] mb-2">{title}</p>
    <p className={`text-[32px] font-[700] tracking-[-0.02em] tabular-nums ${color || "text-slate-900"}`}>{value}</p>
  </div>
);

export default Reports;
