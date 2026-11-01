import React from "react";

export default function AddressFields({ formData, onChange }) {
  return (
    <>
      <div className="md:col-span-3 text-lg font-semibold text-slate-800 border-t pt-4">Main Address</div>
      <div>
        <label htmlFor="address_line_1" className="block text-sm font-medium text-slate-700">
          Address Line 1 (Permanent)
        </label>
        <input
          type="text"
          id="address_line_1"
          name="address_line_1"
          value={formData.address_line_1}
          onChange={onChange}
          className="mt-1 block w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="address_line_2" className="block text-sm font-medium text-slate-700">
          Address Line 2 (Temporary)
        </label>
        <input
          type="text"
          id="address_line_2"
          name="address_line_2"
          value={formData.address_line_2}
          onChange={onChange}
          className="mt-1 block w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="city" className="block text-sm font-medium text-slate-700">
          City
        </label>
        <input
          type="text"
          id="city"
          name="city"
          value={formData.city}
          onChange={onChange}
          className="mt-1 block w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="county" className="block text-sm font-medium text-slate-700">
          County
        </label>
        <input
          type="text"
          id="county"
          name="county"
          value={formData.county}
          onChange={onChange}
          className="mt-1 block w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="post_code" className="block text-sm font-medium text-slate-700">
          Post Code
        </label>
        <input
          type="text"
          id="post_code"
          name="post_code"
          value={formData.post_code}
          onChange={onChange}
          className="mt-1 block w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>
    </>
  );
}
