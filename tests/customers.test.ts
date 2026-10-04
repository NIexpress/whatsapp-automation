import { findOrCreateCustomer, getCustomerById, getCustomerByPhone, normalizePhoneNumber, listCustomers } from "../src/core/customers";

export async function runCustomerTests() {
  console.log("\n🧪 Running Phase 1 Customer Management Tests...");

  // 1. Phone Normalization
  const n1 = normalizePhoneNumber("+91 98765-43210");
  if (n1 !== "919876543210") throw new Error(`Normalization failed for +91 98765-43210, got: ${n1}`);

  const n2 = normalizePhoneNumber("9876543210");
  if (n2 !== "919876543210") throw new Error(`Normalization failed for 10-digit number, got: ${n2}`);
  console.log("   ✅ Phone normalization passed");

  // 2. Customer Upsert & Deduplication
  const testPhone = "919800011223";
  const customer1 = await findOrCreateCustomer({
    phone: testPhone,
    name: "Rohan Varma",
    email: "rohan.v@example.com",
  });

  if (!customer1 || customer1.name !== "Rohan Varma") {
    throw new Error("Customer creation failed.");
  }

  // Deduplication check: calling with same phone updates rather than duplicates
  const customer2 = await findOrCreateCustomer({
    phone: testPhone,
    name: "Rohan Varma Updated",
    email: "rohan.varma@example.com",
  });

  if (customer2.id !== customer1.id) {
    throw new Error("Customer deduplication failed; duplicate ID created.");
  }
  if (customer2.name !== "Rohan Varma Updated") {
    throw new Error("Customer update on conflict failed.");
  }
  console.log("   ✅ Customer creation & deduplication passed");

  // 3. Retrieval by Phone & ID
  const retrievedById = await getCustomerById(customer1.id);
  if (retrievedById.id !== customer1.id) throw new Error("Customer retrieval by ID failed.");

  const retrievedByPhone = await getCustomerByPhone(testPhone);
  if (!retrievedByPhone || retrievedByPhone.id !== customer1.id) {
    throw new Error("Customer retrieval by phone failed.");
  }
  console.log("   ✅ Customer retrieval by ID and Phone passed");

  // 4. Listing & Filtering
  const listResult = await listCustomers({ search: "Rohan" });
  if (listResult.total === 0 || !listResult.customers.some((c) => c.id === customer1.id)) {
    throw new Error("Customer search filter failed.");
  }
  console.log("   ✅ Customer list and search passed");

  return { passed: 4, failed: 0 };
}
