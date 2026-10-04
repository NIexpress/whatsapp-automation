import { registerService, getServiceByCode, listActiveServices, getServiceConfig, setServiceConfig } from "../src/core/services";

export async function runServiceTests() {
  console.log("\n🧪 Running Phase 1 Service Registry & Configuration Tests...");

  // 1. Verify Seeded Dog Day Care Service
  const ddc = await getServiceByCode("DOG_DAY_CARE");
  if (!ddc || ddc.code !== "DOG_DAY_CARE") {
    throw new Error("Dog Day Care service not found in registry.");
  }
  console.log("   ✅ Seeded Dog Day Care service found");

  // 2. Verify Dynamic Config Retrieval
  const defaultCapacity = await getServiceConfig<number>("DOG_DAY_CARE", "DEFAULT_CAPACITY");
  if (defaultCapacity !== 15) {
    throw new Error(`Expected default capacity 15, got: ${defaultCapacity}`);
  }

  const businessHours = await getServiceConfig<any>("DOG_DAY_CARE", "BUSINESS_HOURS");
  if (!businessHours || businessHours.open !== "08:00" || businessHours.close !== "19:00") {
    throw new Error("Invalid business hours config retrieved.");
  }
  console.log("   ✅ Dynamic configuration retrieval passed");

  // 3. Dynamic Configuration Modification & Persistence
  await setServiceConfig("DOG_DAY_CARE", "DEFAULT_CAPACITY", 20);
  const updatedCapacity = await getServiceConfig<number>("DOG_DAY_CARE", "DEFAULT_CAPACITY");
  if (updatedCapacity !== 20) {
    throw new Error(`Config update failed. Expected 20, got: ${updatedCapacity}`);
  }
  // Restore
  await setServiceConfig("DOG_DAY_CARE", "DEFAULT_CAPACITY", 15);
  console.log("   ✅ Configuration update and persistence passed");

  // 4. ARCHITECTURAL GATE VERIFICATION: Register Future Service #2 (Pet Grooming)
  console.log("   🔬 Testing Architectural Gate: Adding Future Service #2 without altering Core...");
  const service2 = await registerService({
    code: "PET_GROOMING",
    name: "Pet Grooming & Spa",
    description: "Professional bath, coat styling, de-shedding, and hygiene treatments.",
    icon: "scissors",
  });

  if (!service2 || service2.code !== "PET_GROOMING") {
    throw new Error("Failed to register Future Service #2 in Needin Core.");
  }

  await setServiceConfig("PET_GROOMING", "GROOMING_STATIONS", 4);
  const stations = await getServiceConfig<number>("PET_GROOMING", "GROOMING_STATIONS");
  if (stations !== 4) {
    throw new Error("Failed to store dynamic config for Future Service #2.");
  }

  const allServices = await listActiveServices();
  const hasDDC = allServices.some((s) => s.code === "DOG_DAY_CARE");
  const hasGrooming = allServices.some((s) => s.code === "PET_GROOMING");
  if (!hasDDC || !hasGrooming) {
    throw new Error("Active services list does not include both services.");
  }
  console.log("   ✅ Architectural Gate Passed: Future Service #2 successfully registered and configured in Needin Core!");

  return { passed: 4, failed: 0 };
}
