import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

// Base URL for OpenLibrary API
const baseUrl = 'https://openlibrary.org';

// Function to fetch works by author and ingest editions
async function fetchWorksAndIngestEditions(authorKey) {
  // Fetch works by author
  const worksResponse = await fetch(`${baseUrl}/authors/${authorKey}/works.json`);
  const worksData = await worksResponse.json();

  // Fetch editions for each work and categorize by type
  for (const work of worksData.entries) {
    const workKey = work.key;
    console.log(`Fetching editions for: ${work.title}`);

    const editionsResponse = await fetch(`${baseUrl}${workKey}/editions.json`);
    const editionsData = await editionsResponse.json();

    for (const edition of editionsData.entries) {
      const editionId = uuidv4(); // Generate a unique ID for the edition
      const workId = workKey.split('/').pop(); // Extract the work ID

      const { isbn, asin, title, format } = edition;
      
      let type = 'Unknown';
      if (isbn) {
        type = 'print';
      } else if (asin) {
        type = 'audiobook';
      } else if (format && format.includes('ebook')) {
        type = 'ebook';
      }

      // Prepare edition data for insertion
      const editionData = {
        id: editionId,
        work_id: workId,
        type,
        format: format || 'Unknown',
        isbn: isbn || null,
        asin: asin || null,
        narrator: edition.narrator || null,
        abridged: edition.abridged || false
      };

      // Call API to create edition (Post to `/editions`)
      await fetch('https://bookframe-worker.nickhowell2.workers.dev/editions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editionData)
      });

      console.log(`✅ Created edition: ${title}`);
    }
  }
}

// Example Author Key (replace with actual author key)
const authorKey = 'OL12520859A';  // J.R.R. Tolkien's OpenLibrary author key

fetchWorksAndIngestEditions(authorKey);
