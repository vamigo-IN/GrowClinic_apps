// Helper to determine if we are in Mock Mode. 
// Set USE_MOCK_GOOGLE_API=true in .env to bypass actual Google calls.
const isMockMode = () => process.env.USE_MOCK_GOOGLE_API === "true";

export async function getGoogleAccounts(accessToken) {
  if (isMockMode()) {
    return [{ name: "accounts/mock-account-123", accountName: "Mock Account" }];
  }
  
  const url = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Google Accounts API error: ${res.status} - ${await res.text()}`);
  const data = await res.json();
  return data.accounts || [];
}

export async function getLocationsForAccount(accessToken, accountName) {
  if (isMockMode()) {
    return [
      { name: "locations/mock-12345", title: "Bright Smile Dental (Austin)", storefrontAddress: { addressLines: ["123 Main St, Austin, TX"] } },
      { name: "locations/mock-67890", title: "Bright Smile Dental (Dallas)", storefrontAddress: { addressLines: ["456 Oak Ave, Dallas, TX"] } }
    ];
  }

  const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Google Locations API error: ${res.status} - ${await res.text()}`);
  const data = await res.json();
  return data.locations || [];
}

export async function getGoogleLocation(accessToken, googleLocationId) {
  if (isMockMode()) {
    // Return a mocked Google Business Profile that is missing a few fields
    // so our Health Score checker will detect them and generate actionable issues.
    return {
      name: googleLocationId,
      title: "My Clinic (Mock)",
      phoneNumbers: {
        primaryPhone: "" // Missing
      },
      categories: {
        primaryCategory: { name: "Medical Clinic" }
      },
      profile: {
        description: "A top-rated medical clinic."
      },
      regularHours: null, // Missing hours
      storefrontAddress: {
        addressLines: ["123 Mock Street"],
        locality: "Mock City",
        administrativeArea: "MC",
        regionCode: "US",
        postalCode: "12345"
      },
      websiteUri: "" // Missing website
    };
  }

  // Real API call
  const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${googleLocationId}?readMask=name,title,phoneNumbers,categories,regularHours,storefrontAddress,websiteUri,profile`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google API error: ${res.status} - ${errorText}`);
  }
  return res.json();
}

export async function updateGoogleLocation(accessToken, googleLocationId, updates, updateMask) {
  if (isMockMode()) {
    console.log("[mock] updateGoogleLocation called with:", googleLocationId, updates, updateMask);
    return { success: true, mocked: true };
  }

  const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${googleLocationId}?updateMask=${updateMask}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(updates)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google API error: ${res.status} - ${errorText}`);
  }
  return res.json();
}
