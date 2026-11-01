import React from "react";
import { Plus, RotateCw, ListFilter, FileUp, FileDown } from "lucide-react";
import ImportCsvButton from "./ImportCsvButton";
import { Button } from "./ui/button.jsx";
import { buttonVariants } from "./ui/buttonVariants.js";
import { PageHeader } from "./common/PageShell.jsx";

const LeadsHeader = ({
  handleOpenAddModal,
  canManageLeads,
  authToken,
  handleRefresh,
  handleExport,
  exporting,
  showFilters,
  setShowFilters,
  totalCount = 0,
}) => {
  return (
    <>
      <PageHeader
        title="Leads Management"
        description="Manage, filter, import and track school leads across intake channels."
        badge={(
          <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {totalCount} Total
          </span>
        )}
        actions={(
          <>
          <Button
            type="button"
            variant={showFilters ? "outline" : "secondary"}
            onClick={() => setShowFilters(!showFilters)}
          >
            <ListFilter className="h-4 w-4" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>

          <Button
            type="button"
            variant="refresh"
            onClick={handleRefresh}
          >
            <RotateCw className="h-4 w-4" />
            Refresh
          </Button>

          {canManageLeads && (
            <ImportCsvButton
              authToken={authToken}
              id="headerCsvUpload"
              customButton={
                <span className={buttonVariants({ variant: "secondary" })}>
                  <FileUp className="h-4 w-4" />
                  Import CSV / Excel
                </span>
              }
            />
          )}

          <Button
            type="button"
            variant="secondary"
            onClick={handleExport}
          >
            <FileDown className="h-4 w-4" />
            Export CSV
          </Button>

          {canManageLeads && (
            <Button
              type="button"
              variant="primary"
              onClick={handleOpenAddModal}
            >
              <Plus className="h-4 w-4" />
              Add New Lead
            </Button>
          )}
          </>
        )}
      />

      {exporting && (
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Exporting the current filtered page…
        </div>
      )}
    </>
  );
};

export default LeadsHeader;
