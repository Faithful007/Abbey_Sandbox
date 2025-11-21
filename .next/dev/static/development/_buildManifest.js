self.__BUILD_MANIFEST = {
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