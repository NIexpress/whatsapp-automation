async function checkAllRoutes() {
  console.log("1. Authenticating as owner@needin.com...");
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "owner@needin.com",
      password: "Needin@2026",
    }),
  });

  const cookieHeader = loginRes.headers.get("set-cookie");
  if (!cookieHeader) {
    console.error("Failed to get auth cookie!");
    return;
  }
  const tokenCookie = cookieHeader.split(";")[0];
  console.log("Logged in successfully. Auth cookie:", tokenCookie);

  const pages = [
    "/dashboard",
    "/dashboard/bookings",
    "/dashboard/customers",
    "/dashboard/dogs",
    "/dashboard/vaccinations",
    "/dashboard/pricing",
    "/dashboard/templates",
    "/dashboard/staff",
    "/dashboard/audit",
  ];

  console.log("\n2. Checking Authenticated Dashboard Pages:");
  for (const p of pages) {
    try {
      const res = await fetch(`http://localhost:3000${p}`, {
        headers: { Cookie: tokenCookie },
      });
      console.log(`[${res.status === 200 ? "PASS" : "FAIL"}] ${p} -> Status ${res.status}`);
    } catch (e: any) {
      console.log(`[ERR] ${p} -> ${e.message}`);
    }
  }

  const apis = [
    "/api/auth/me",
    "/api/core/customers",
    "/api/core/staff",
    "/api/core/templates",
    "/api/core/audit",
    "/api/dog-daycare/dogs",
    "/api/dog-daycare/packages",
    "/api/dog-daycare/bookings",
    "/api/dog-daycare/vaccinations",
  ];

  console.log("\n3. Checking Authenticated APIs:");
  for (const a of apis) {
    try {
      const res = await fetch(`http://localhost:3000${a}`, {
        headers: { Cookie: tokenCookie },
      });
      console.log(`[${res.status === 200 ? "PASS" : "FAIL"}] ${a} -> Status ${res.status}`);
    } catch (e: any) {
      console.log(`[ERR] ${a} -> ${e.message}`);
    }
  }
}

checkAllRoutes();
