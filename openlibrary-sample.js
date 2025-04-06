import fetch from 'node-fetch';

async function fetchBookDetails(workKey) {
  const url = `https://openlibrary.org${workKey}.json`;
  const res = await fetch(url);
  return res.json();
}

async function fetchBooksFromOpenLibrary(author = "andy weir") {
  const searchRes = await fetch(`https://openlibrary.org/search.json?author=${encodeURIComponent(author)}&limit=5`);
  const searchData = await searchRes.json();

  if (!searchData.docs || searchData.docs.length === 0) {
    console.log("No works found.");
    return;
  }

  const books = await Promise.all(
    searchData.docs.map(async (doc) => {
      const workDetails = await fetchBookDetails(doc.key);
      return {
        title: doc.title,
        work_key: doc.key,
        first_publish_year: doc.first_publish_year,
        authors: workDetails?.authors?.map(a => a.author?.key).filter(Boolean) ?? [],
        description:
          typeof workDetails?.description === 'string'
            ? workDetails.description
            : workDetails?.description?.value ?? null,
        cover_id: workDetails?.covers?.[0] ?? null,
      };
    })
  );

  console.dir(books, { depth: null });
}

fetchBooksFromOpenLibrary().catch(console.error);
