// src/components/ColumnToggler.jsx
import React from "react";
import { Menu } from "@headlessui/react";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";

const ColumnToggler = ({ columns, setColumns }) => {
  const toggleColumn = (key) => {
    setColumns((prev) => ({
      ...prev,
      [key]: { ...prev[key], visible: !prev[key].visible },
    }));
  };

  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
        <Cog6ToothIcon className="h-5 w-5 mr-2" />
        Columns
      </Menu.Button>
      <Menu.Items className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10 max-h-60 overflow-y-auto">
        <div className="py-1">
          {Object.entries(columns).map(([key, { label, visible }]) => (
            <Menu.Item key={key} as="div">
              {({ active }) => (
                <label
                  onClick={(e) => e.preventDefault()}
                  className={`${
                    active ? "bg-gray-100 text-gray-900" : "text-gray-700"
                  } flex items-center px-4 py-2 text-sm cursor-pointer`}
                >
                  <input
                    type="checkbox"
                    checked={visible}
                    onChange={() => toggleColumn(key)}
                    className="h-4 w-4 rounded border-gray-300 text-[#294998] focus:ring-[#294998] mr-3"
                  />
                  {label}
                </label>
              )}
            </Menu.Item>
          ))}
        </div>
      </Menu.Items>
    </Menu>
  );
};

export default ColumnToggler;
