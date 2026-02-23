import React, { useState } from "react";
import { Button, Card, SearchInput } from "../shared/UIComponents";
import { Search, Book, Image as ImageIcon, Loader2, Plus } from "lucide-react";
import { addItem } from "../../services/storageService";

interface LibrarySearchProps {
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  isbn?: string[];
  publisher?: string[];
}

export const LibrarySearch: React.FC<LibrarySearchProps> = ({ showToast }) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<OpenLibraryDoc[]>([]);
  const [addingStates, setAddingStates] = useState<Record<string, boolean>>({});

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResults([]);

    try {
      // Using generic search, works for title, author, and ISBN
      const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch results from OpenLibrary");
      }

      const data = await response.json();
      setResults(data.docs || []);

      if (data.docs?.length === 0) {
        showToast("No books found. Try a different search term.", "info");
      }
    } catch (error) {
      console.error(error);
      showToast("Error searching for books. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddBook = async (book: OpenLibraryDoc) => {
    setAddingStates((prev) => ({ ...prev, [book.key]: true }));

    try {
      const title = book.title;
      const author = book.author_name
        ? book.author_name.join(", ")
        : "Unknown Author";
      const year = book.first_publish_year
        ? String(book.first_publish_year)
        : "n.d.";
      const publisher = book.publisher
        ? book.publisher[0]
        : "Unknown Publisher";

      // Auto-generate APA Citation
      const citation = `${author}. (${year}). ${title}. ${publisher}.`;

      // We will create some placeholder text so the item isn't entirely "blank" in the viewer
      const placeholderText = `Physical capture record for: ${title} by ${author}.`;

      await addItem({
        text: placeholderText,
        sourceTitle: title,
        sourceUrl: `https://openlibrary.org${book.key}`,
        citation: citation,
        deviceSource: "web",
        imageUrl: book.cover_i
          ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
          : undefined,
      });

      showToast(`Added "${title}" to your Dashboard!`, "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to add book to Dashboard.", "error");
    } finally {
      setAddingStates((prev) => ({ ...prev, [book.key]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
          <Book className="w-5 h-5 text-primary-600" /> Book & Library Search
        </h3>
        <p className="text-gray-500 mb-6 text-sm">
          Search for physical books by Title, Author, or ISBN barcode to add
          them to your research collection.
        </p>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1">
            <SearchInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter book title, author, or ISBN..."
            />
          </div>
          <Button type="submit" disabled={loading || !query.trim()}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4 mr-2" />
            )}
            Search
          </Button>
        </form>
      </Card>

      {/* Results Section */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((book) => (
            <Card
              key={book.key}
              className="p-4 flex gap-4 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
            >
              {/* Cover Image */}
              <div className="w-20 h-28 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                {book.cover_i ? (
                  <img
                    src={`https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`}
                    alt={`Cover for ${book.title}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                )}
              </div>

              {/* Book Details */}
              <div className="flex flex-col flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 dark:text-white line-clamp-2 text-sm">
                  {book.title}
                </h4>
                <p className="text-gray-500 text-xs mt-1 line-clamp-1">
                  {book.author_name
                    ? book.author_name.join(", ")
                    : "Unknown Author"}
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  {book.first_publish_year || "Unknown Year"}
                </p>

                <div className="mt-auto pt-3">
                  <Button
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => handleAddBook(book)}
                    disabled={addingStates[book.key]}
                  >
                    {addingStates[book.key] ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <Plus className="w-3 h-3 mr-1" />
                    )}
                    Add to Dashboard
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
