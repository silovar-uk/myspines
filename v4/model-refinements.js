const createBookBeforeHeadingNumberPreference = createBook;
const normalizeBookBeforeHeadingNumberPreference = normalizeBook;

createBook = function createBookWithHeadingNumberPreference(...args) {
  const book = createBookBeforeHeadingNumberPreference(...args);
  book.view.showHeadingNumbers = true;
  return book;
};

normalizeBook = function normalizeBookWithHeadingNumberPreference(raw) {
  const book = normalizeBookBeforeHeadingNumberPreference(raw);
  book.view.showHeadingNumbers = raw?.view?.showHeadingNumbers !== false;
  return book;
};
