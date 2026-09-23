// Central HTTP client. All API calls MUST go through this module (or the
// feature-level api/ wrappers that use it) — never call fetch/axios directly
// from components.
//
// TODO: implement base fetch wrapper with:
//   - base URL from import.meta.env.VITE_API_BASE_URL
//   - auth token attachment
//   - error normalization
//   - request/response interceptors

export {};
