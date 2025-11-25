self.__BUILD_MANIFEST = {
  "/_error": [
    "static/chunks/pages/_error.js"
  ],
  "/forgot-password": [
    "static/chunks/pages/forgot-password.js"
  ],
  "/login": [
    "static/chunks/pages/login.js"
  ],
  "/registration": [
    "static/chunks/pages/registration.js"
  ],
  "/registration/list": [
    "static/chunks/pages/registration/list.js"
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