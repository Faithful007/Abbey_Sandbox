self.__BUILD_MANIFEST = {
  "/_error": [
    "static/chunks/pages/_error.js"
  ],
  "/dashboard": [
    "static/chunks/pages/dashboard.js"
  ],
  "/login": [
    "static/chunks/pages/login.js"
  ],
  "/registration": [
    "static/chunks/pages/registration.js"
  ],
  "__rewrites": {
    "afterFiles": [
      {
        "source": "/api/:path*"
      }
    ],
    "beforeFiles": [],
    "fallback": []
  },
  "sortedPages": [
    "/_app",
    "/_error",
    "/dashboard",
    "/forgot-password",
    "/login",
    "/registration",
    "/registration/list"
  ]
};self.__BUILD_MANIFEST_CB && self.__BUILD_MANIFEST_CB()