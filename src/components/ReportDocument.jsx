// src/components/ReportDocument.jsx

import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const PDF_TOKENS = {
  primary: "#294998",
  primaryLight: "#EDF2FC",
  accentLight: "#FEF7EB",
  canvas: "#F8FAFC",
  canvasSubtle: "#F1F5F9",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  border: "#CBD5E1",
};

// PDF date helper
const formatDateForPdf = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
};

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: "Helvetica" },
  header: {
    fontSize: 24,
    marginBottom: 10,
    textAlign: "center",
    color: PDF_TOKENS.textPrimary,
    fontWeight: "bold",
  },
  subHeader: {
    fontSize: 12,
    marginBottom: 20,
    textAlign: "center",
    color: PDF_TOKENS.textSecondary,
  },
  section: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: PDF_TOKENS.canvas,
    borderRadius: 5,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 10,
    fontWeight: "bold",
    color: PDF_TOKENS.textPrimary,
  },
  statsGrid: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statCard: {
    width: "30%",
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    textAlign: "center",
    backgroundColor: PDF_TOKENS.primaryLight,
    border: `1px solid ${PDF_TOKENS.primaryLight}`,
  },
  statTitle: { fontSize: 12, color: PDF_TOKENS.textSecondary },
  statValue: { fontSize: 20, fontWeight: "bold", color: PDF_TOKENS.primary },

  listContainer: { marginTop: 20 },
  table: {
    display: "table",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: PDF_TOKENS.border,
    marginBottom: 10,
  },
  tableRow: { margin: "auto", flexDirection: "row" },
  tableColHeader: {
    width: "14%",
    borderStyle: "solid",
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: PDF_TOKENS.border,
    padding: 5,
    backgroundColor: PDF_TOKENS.canvasSubtle,
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 7,
  },
  tableCol: {
    width: "14%",
    borderStyle: "solid",
    borderBottomWidth: 0,
    borderRightWidth: 1,
    borderColor: PDF_TOKENS.border,
    padding: 5,
    fontSize: 6,
  },
  colName: { width: "8%" },
  colEmail: { width: "10%" },
  colPhone: { width: "7%" },
  colCourse: { width: "8%" },
  colStatus: { width: "5%" },
  colAddDate: { width: "6%" },
  colRecentCall: { width: "6%" },
  colNextCall: { width: "6%" },
  colAddress: { width: "8%" },
  colCity: { width: "5%" },
  colCourseType: { width: "6%" },
  colRemarks: { width: "8%" },
});

// Columns used in the PDF table (subset for readability)
const convertedStudentsPdfTableColumns = [
  { header: "School", accessor: "studentName", style: styles.colName },
  { header: "Email", accessor: "email", style: styles.colEmail },
  { header: "Phone", accessor: "phone", style: styles.colPhone },
  { header: "Class", accessor: "course", style: styles.colCourse },
  { header: "Status", accessor: "status", style: styles.colStatus },
  { header: "Add Date", accessor: "addDate", style: styles.colAddDate },
  {
    header: "Recent Call",
    accessor: "recentCall",
    style: styles.colRecentCall,
  },
  { header: "Next Call", accessor: "nextCall", style: styles.colNextCall },
  { header: "Address", accessor: "address", style: styles.colAddress },
  { header: "City", accessor: "city", style: styles.colCity },
  {
    header: "Class Type",
    accessor: "courseType",
    style: styles.colCourseType,
  },
  { header: "Remarks", accessor: "remarks", style: styles.colRemarks },
];

const TableHeader = ({ columns }) => (
  <View style={styles.tableRow} fixed>
    {columns.map((col, i) => (
      <View key={i} style={[styles.tableColHeader, col.style || {}]}>
        <Text>{col.header}</Text>
      </View>
    ))}
  </View>
);

const TableRow = ({ row, columns }) => (
  <View style={styles.tableRow}>
    {columns.map((col, i) => (
      <View key={i} style={[styles.tableCol, col.style || {}]}>
        <Text>{row[col.accessor]}</Text>
      </View>
    ))}
  </View>
);

const ReportDocument = ({ reportData, filterCriteria }) => {
  let filterText = "All Time";
  if (
    filterCriteria.filterType === "dateRange" &&
    filterCriteria.startDate &&
    filterCriteria.endDate
  ) {
    filterText = `From ${formatDateForPdf(
      filterCriteria.startDate
    )} to ${formatDateForPdf(filterCriteria.endDate)}`;
  }

  return (
    <Document>
      <Page size="A4" style={styles.page} orientation="landscape">
        <Text style={styles.header}>CRM Performance Report</Text>
        <Text style={styles.subHeader}>Report Period: {filterText}</Text>

        {/* Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statTitle}>Total Leads</Text>
              <Text style={styles.statValue}>{reportData.totalLeads}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statTitle}>Active Leads</Text>
              <Text style={styles.statValue}>{reportData.activeLeads}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statTitle}>Enrolled Schools</Text>
              <Text style={styles.statValue}>{reportData.convertedLeads}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statTitle}>Lost Leads</Text>
              <Text style={styles.statValue}>{reportData.lostLeads}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statTitle}>Leads Not Enrolled</Text>
              <Text style={styles.statValue}>{reportData.missedLeads}</Text>
            </View>
          </View>
        </View>

        {/* Enrolled Schools */}
        <View style={[styles.section, styles.listContainer]}>
          <Text style={styles.sectionTitle}>Enrolled Schools List</Text>
          <View style={styles.table}>
            <TableHeader columns={convertedStudentsPdfTableColumns} />
            {reportData.convertedStudentsList.map((row) => (
              <TableRow
                key={row._id}
                row={row}
                columns={convertedStudentsPdfTableColumns}
              />
            ))}
          </View>
          {reportData.convertedStudentsList.length === 0 && (
            <Text style={{ fontSize: 10, textAlign: "center", color: PDF_TOKENS.textMuted }}>
              No enrolled schools found for this report period.
            </Text>
          )}
        </View>

        {/* Footer */}
        <Text
          style={{
            position: "absolute",
            fontSize: 8,
            bottom: 30,
            left: 0,
            right: 0,
            textAlign: "center",
            color: "grey",
          }}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
};

export default ReportDocument;
