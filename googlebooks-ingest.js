import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

const apiKey = ''; // Optional: use a Google Books API key if needed
const baseUrl = 'https://www.googleapis.com/books/v1/volumes?q=inauthor:"John Grisham"&maxResults=40';

async function fetchBooksAndIngest() {
  const response = await fetch(baseUrl);
  const data = await response.json();

  const authorId = '6e6800ee-6e3f-48f9-8718-7dc48b6613f4'; // John Grisham's UUID in your system

  for (const item of data.items || []) {
    const volume = item.volumeInfo;
    const title = volume.title;
    const description = volume.description || '';
    const identifiers = volume.industryIdentifiers || [];
    const formatHints = [volume.printType, volume.subtitle, description].join(' ').toLowerCase();

    // Determine edition type
    let type = 'unknown';
    if (formatHints.includes('audiobook') || formatHints.includes('narrated') || formatHints.includes('mp3')) {
      type = 'audiobook';
    } else if (volume.isEbook || formatHints.includes('ebook') || formatHints.includes('kindle')) {
      type = 'ebook';
    } else if (formatHints.includes('paperback') || formatHints.includes('hardcover') || formatHints.includes('print')) {
      type = 'print';
    }

    const isbnObj = identifiers.find(id => id.type.includes('ISBN'));
    const asinObj = identifiers.find(id => id.type === 'OTHER'); // sometimes ASINs show up here
    const isbn = isbnObj?.identifier || null;
    const asin = asinObj?.identifier?.startsWith('B') ? asinObj.identifier : null;

    const workId = uuidv4();
    const editionId = uuidv4();

    // Create the work
    await fetch('https://bookframe-worker.nickhowell2.workers.dev/works', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: workId,
        title,
        author: 'John Grisham',
        description,
        cover_url: volume.imageLinks?.thumbnail || null
      })
    });
    console.log(`📘 Created work: ${title}`);

    // Link work to author
    await fetch('https://bookframe-worker.nickhowell2.workers.dev/work-authors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        work_id: workId,
        author_id: authorId
      })
    });
    console.log(`🔗 Linked work to author`);

    // Create the edition
    await fetch('https://bookframe-worker.nickhowell2.workers.dev/editions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editionId,
        work_id: workId,
        type,
        format: volume.printType || 'unknown',
        isbn,
        asin,
        narrator: null,
        abridged: null
      })
    });
    console.log(`📦 Created edition for: ${title} [${type}]`);
  }

  console.log('✅ All enhanced books ingested.');
}

fetchBooksAndIngest();
