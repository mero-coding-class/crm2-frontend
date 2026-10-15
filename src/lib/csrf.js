// Read the CSRF token from the csrftoken cookie (not HttpOnly — JS can read it).
// Required on every POST/PATCH/DELETE per the API contract.
export const getCsrfToken = () => {
  try {
    return (
      document.cookie
        .split("; ")
        .find((c) => c.startsWith("csrftoken="))
        ?.split("=")[1] || ""
    );
  } catch {
    return "";
  }
};
