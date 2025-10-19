import SibApiV3Sdk from "sib-api-v3-sdk";
import dotenv from "dotenv";

dotenv.config();

const client = SibApiV3Sdk.ApiClient.instance;
client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

const contactsApi = new SibApiV3Sdk.ContactsApi();

// Replace this with your actual list ID from Brevo dashboard
const LIST_ID = 2;

export const addToBrevoList = async (email, name = "") => {
  try {
    const createContact = {
      email,
      attributes: {
        FIRSTNAME: name,
      },
      listIds: [LIST_ID],
      updateEnabled: true,
    };

    await contactsApi.createContact(createContact);
    console.log(`✅ Synced ${email} to Brevo list`);
  } catch (err) {
    console.error("❌ Brevo sync failed:", err?.response?.body || err.message);
    throw err;
  }
};
