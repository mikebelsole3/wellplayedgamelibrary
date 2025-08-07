import './App.css'
import { useState, useEffect, useMemo } from 'react';

type BoardGame = {
  id: string,
  name: string,
  minPlayers: number,
  maxPlayers: number,
  difficulty: number,
  minTime: number,
  maxTime: number,
  shelfLocation: string,
  description: string,
  imageUrl: string,
  weight: number,
  itemType: string,
  rank: number | null,
  average: number | null,
  retailPrice: number | null,
  bggRecAgeRange: string | null,
  minAgeValue: number | null,
  staffpicksname: string | null,
  staffpicksdescription: string | null,
  category: Array<string>,
  mechanism: Array<string>,
  designer: Array<string>,
  artist: Array<string>,
  publisher: Array<string>,
  family: string | null,
  own: number,
  yearPublished: number | null // Added yearPublished
}

// IMPORTANT: Replace this with the actual URL of your published Google Sheet data (e.g., as CSV)
// You will need to replace 'YOUR_SHEET_ID' and potentially 'gid' if you have multiple sheets.
const GOOGLE_SHEET_DATA_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ82tONzKAbS4g8sfREBApuIw7f8WfIFN2z98r6Br8FEWw8jZK3dCRZXl5XbY8SZbRMLUNp8H7ov99W/pub?gid=202930632&single=true&output=csv';

// Utility function to get unique values for filters and sort them alphabetically, ignoring articles
const getUniqueValues = (data: Array<BoardGame>, key: keyof BoardGame) => {
  const values = data.flatMap(item => item[key] || []).filter(value => Boolean(value));
  const uniqueValues = [...new Set(values)] as string[]; // Cast to string[] for string methods

  // Function to normalize string for sorting (ignoring articles)
  const normalizeForSort = (str: string) => {
    return str.toLowerCase().replace(/^(a|an|the)\s+/i, '');
  };

  return uniqueValues.sort((a, b) => {
    const normalizedA = normalizeForSort(a);
    const normalizedB = normalizeForSort(b);
    return normalizedA.localeCompare(normalizedB);
  });
};

// Function to get discrete colors for the weight rating
const getColorForWeight = (weight: number) => {
  const clampedWeight = Math.max(1, Math.min(5, weight));

  if (clampedWeight >= 1 && clampedWeight <= 2) {
    return 'rgb(0, 170, 0)'; // Green for Low
  } else if (clampedWeight > 2 && clampedWeight <= 2.5) {
    return 'rgb(200, 200, 0)'; // Yellow for Medium
  } else if (clampedWeight > 2.5 && clampedWeight <= 5) {
    return 'rgb(255, 0, 0)'; // Red for High
  }
  return 'rgb(0,0,0)'; // Default to black if outside expected range
};

// Helper function to parse comma-separated tags, handling quoted commas
const parseCommaSeparatedTags = (tagString: string) => {
  if (!tagString) return [];
  const tags = [];
  // This regex splits by comma, but not if the comma is inside double quotes.
  // It captures either content inside quotes (group 1) or content outside quotes (group 2).
  const regex = /(?:"([^"]*)"|([^,]+))/g;
  let match;
  while ((match = regex.exec(tagString)) !== null) {
    const tag = match[1] !== undefined ? match[1] : match[2];
    if (tag) {
      tags.push(tag.trim());
    }
  }
  return tags.filter(t => t !== ''); // Filter out any empty strings
};

type CurrentFilters = {
  searchTerm: string,
  desiredPlayers: number
  desiredTime: number
  selectedWeightCategory: string
  selectedMinAge: number
  showTop100: boolean
  showGamesWeSell: boolean
  showStaffPicks: boolean
  selectedCategories: Array<string>
  selectedMechanisms: Array<string>,
  selectedDesigners: Array<string>,
  selectedArtists: Array<string>,
  selectedPublishers: Array<string>,
  showNCDesignedGames: boolean,
  selectedYearPublished: number // Added selectedYearPublished
}

type GeneralFilterModalProps = {
  currentFilters: CurrentFilters,
  uniqueCategories: Array<string>,
  uniqueMechanisms: Array<string>,
  uniqueDesigners: Array<string>,
  uniqueArtists: Array<string>,
  uniquePublishers: Array<string>,
  uniqueYearsPublished: Array<number>, // Added uniqueYearsPublished
  onApplyFilters: (newFilters: CurrentFilters) => void,
  onClose: () => void,
}

// Consolidated Filter Modal Component
const GeneralFilterModal = (props: GeneralFilterModalProps) => {
  const {
    currentFilters,
    uniqueCategories,
    uniqueMechanisms,
    uniqueDesigners,
    uniqueArtists,
    uniquePublishers,
    uniqueYearsPublished, // Destructure uniqueYearsPublished
    onApplyFilters,
    onClose
  } = props;

  // Internal temporary states for all filters
  const [tempDesiredPlayers, setTempDesiredPlayers] = useState(currentFilters.desiredPlayers);
  const [tempDesiredTime, setTempDesiredTime] = useState(currentFilters.desiredTime);
  const [tempSelectedWeightCategory, setTempSelectedWeightCategory] = useState(currentFilters.selectedWeightCategory);
  const [tempSelectedMinAge, setTempSelectedMinAge] = useState(currentFilters.selectedMinAge);
  const [tempShowTop100, setTempShowTop100] = useState(currentFilters.showTop100);
  const [tempShowGamesWeSell, setTempShowGamesWeSell] = useState(currentFilters.showGamesWeSell);
  const [tempShowStaffPicks, setTempShowStaffPicks] = useState(currentFilters.showStaffPicks);
  const [tempSelectedCategories, setTempSelectedCategories] = useState(currentFilters.selectedCategories);
  const [tempSelectedMechanisms, setTempSelectedMechanisms] = useState(currentFilters.selectedMechanisms);
  const [tempSelectedDesigners, setTempSelectedDesigners] = useState(currentFilters.selectedDesigners);
  const [tempSelectedArtists, setTempSelectedArtists] = useState(currentFilters.selectedArtists);
  const [tempSelectedPublishers, setTempSelectedPublishers] = useState(currentFilters.selectedPublishers);
  const [tempShowNCDesignedGames, setTempShowNCDesignedGames] = useState(currentFilters.showNCDesignedGames);
  const [tempSelectedYearPublished, setTempSelectedYearPublished] = useState(currentFilters.selectedYearPublished); // Added tempSelectedYearPublished

  // New state for advanced filters collapse
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Handlers for temporary filter changes
  const handleTempPlayersChange = (delta: number) => {
    setTempDesiredPlayers(prev => Math.max(0, prev + delta));
  };

  const handleTempTimeChange = (delta: number) => {
    setTempDesiredTime(prev => Math.max(0, prev + delta));
  };

  const handleTempCategoryToggle = (category: string) => {
    setTempSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleTempMechanismToggle = (mechanism: string) => {
    setTempSelectedMechanisms(prev =>
      prev.includes(mechanism)
        ? prev.filter(m => m !== mechanism)
        : [...prev, mechanism]
    );
  };

  // New handlers for Designer, Artist, Publisher
  const handleTempDesignerToggle = (designer: string) => {
    setTempSelectedDesigners(prev =>
      prev.includes(designer)
        ? prev.filter(d => d !== designer)
        : [...prev, designer]
    );
  };

  const handleTempArtistToggle = (artist: string) => {
    setTempSelectedArtists(prev =>
      prev.includes(artist)
        ? prev.filter(a => a !== artist)
        : [...prev, artist]
    );
  };

  const handleTempPublisherToggle = (publisher: string) => {
    setTempSelectedPublishers(prev =>
      prev.includes(publisher)
        ? prev.filter(p => p !== publisher)
        : [...prev, publisher]
    );
  };

  const handleApplyClick = () => {
    onApplyFilters({
      searchTerm: currentFilters.searchTerm,
      desiredPlayers: tempDesiredPlayers,
      desiredTime: tempDesiredTime,
      selectedWeightCategory: tempSelectedWeightCategory,
      selectedMinAge: tempSelectedMinAge,
      showTop100: tempShowTop100,
      showGamesWeSell: tempShowGamesWeSell,
      showStaffPicks: tempShowStaffPicks,
      selectedCategories: tempSelectedCategories,
      selectedMechanisms: tempSelectedMechanisms,
      selectedDesigners: tempSelectedDesigners,
      selectedArtists: tempSelectedArtists,
      selectedPublishers: tempSelectedPublishers,
      showNCDesignedGames: tempShowNCDesignedGames,
      selectedYearPublished: tempSelectedYearPublished, // Pass selectedYearPublished
    });
  };

  const handleResetClick = () => {
    // Reset temporary states to their initial (all/any) values
    setTempDesiredPlayers(0);
    setTempDesiredTime(0);
    setTempSelectedWeightCategory('');
    setTempSelectedMinAge(0);
    setTempShowTop100(false);
    setTempShowGamesWeSell(false);
    setTempShowStaffPicks(false);
    setTempSelectedCategories([]);
    setTempSelectedMechanisms([]);
    setTempSelectedDesigners([]);
    setTempSelectedArtists([]);
    setTempSelectedPublishers([]);
    setTempShowNCDesignedGames(false);
    setTempSelectedYearPublished(0); // Reset selectedYearPublished
    setShowAdvancedFilters(false); // Reset advanced filters state too
  };


  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 z-50 overflow-y-auto" // Outer overlay is scrollable
      onClick={onClose} // Close modal when clicking outside
    >
      {/* Changed items-center to items-start */}
      <div className="flex items-start justify-center min-h-full p-4">
        <div className="bg-white p-6 rounded-xl shadow-2xl max-w-2xl w-full mx-auto relative transform scale-95 md:scale-100 transition-transform duration-300 ease-out max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}> {/* Prevent clicks inside from closing modal */}
          <h3 className="text-3xl font-bold text-gray-800 mb-6 text-center">All Filters</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            {/* Desired Players Input with Buttons */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Desired Players
              </label>
              <div className="flex items-center justify-center space-x-2 bg-gray-100 p-2 rounded-lg border border-gray-300">
                <button
                  onClick={() => handleTempPlayersChange(-1)}
                  className="px-4 py-2 bg-blue-500 text-white font-bold rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 text-lg"
                  disabled={tempDesiredPlayers <= 0}
                >
                  -
                </button>
                <span className="text-2xl font-bold text-gray-800 w-12 text-center">
                  {tempDesiredPlayers === 0 ? 'Any' : tempDesiredPlayers}
                </span>
                <button
                  onClick={() => handleTempPlayersChange(1)}
                  className="px-4 py-2 bg-blue-500 text-white font-bold rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 text-lg"
                >
                  +
                </button>
              </div>
            </div>

            {/* Desired Time Input with Buttons */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Desired Play Time (min)
              </label>
              <div className="flex items-center justify-center space-x-2 bg-gray-100 p-2 rounded-lg border border-gray-300">
                <button
                  onClick={() => handleTempTimeChange(-5)}
                  className="px-4 py-2 bg-blue-500 text-white font-bold rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 text-lg"
                  disabled={tempDesiredTime <= 0}
                >
                  -
                </button>
                <span className="text-2xl font-bold text-gray-800 w-20 text-center">
                  {tempDesiredTime === 0 ? 'Any' : `${tempDesiredTime} min`}
                </span>
                <button
                  onClick={() => handleTempTimeChange(5)}
                  className="px-4 py-2 bg-blue-500 text-white font-bold rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 text-lg"
                >
                  +
                </button>
              </div>
            </div>

            {/* Complexity Filter */}
            <div>
              <label htmlFor="modalWeightCategory" className="block text-gray-700 font-semibold mb-2">
                Complexity
              </label>
              <select
                id="modalWeightCategory"
                value={tempSelectedWeightCategory}
                onChange={(e) => setTempSelectedWeightCategory(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              >
                <option value="">All</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            {/* Minimum Age Filter */}
            <div>
              <label htmlFor="modalMinAge" className="block text-gray-700 font-semibold mb-2">
                Minimum Age
              </label>
              <select
                id="modalMinAge"
                value={tempSelectedMinAge}
                onChange={(e) => setTempSelectedMinAge(parseInt(e.target.value, 10))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              >
                <option value={0}>Any</option>
                <option value={3}>3+</option>
                <option value={5}>5+</option>
                <option value={8}>8+</option>
                <option value={10}>10+</option>
              </select>
            </div>
          </div>

          {/* Button Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <button
              onClick={() => setTempShowTop100(!tempShowTop100)}
              className={`px-6 py-3 font-bold rounded-lg shadow-md transition duration-200 ${tempShowTop100 ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-purple-200 text-purple-800 hover:bg-purple-300'
                }`}
            >
              BGG Top 100 Games
            </button>
            <button
              onClick={() => setTempShowGamesWeSell(!tempShowGamesWeSell)}
              className={`px-6 py-3 font-bold rounded-lg shadow-md transition duration-200 ${tempShowGamesWeSell ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-green-200 text-green-800 hover:bg-green-300'
                }`}
            >
              Games We Sell
            </button>
            <button
              onClick={() => setTempShowStaffPicks(!tempShowStaffPicks)}
              className={`px-6 py-3 font-bold rounded-lg shadow-md transition duration-200 ${tempShowStaffPicks ? 'bg-pink-600 text-white hover:bg-pink-700' : 'bg-pink-200 text-pink-800 hover:bg-pink-300'
                }`}
            >
              Staff Picks
            </button>
            <button
              onClick={() => setTempShowNCDesignedGames(!tempShowNCDesignedGames)}
              className={`px-6 py-3 font-bold rounded-lg shadow-md transition duration-200 ${tempShowNCDesignedGames ? 'bg-[#155084] text-white hover:bg-blue-900' : 'bg-blue-200 text-blue-800 hover:bg-blue-300'
                }`}
            >
              Games Designed in NC
            </button>
          </div>

          {/* Advanced Filters Section (Collapsible) */}
          <div className="mt-6 border border-gray-300 rounded-xl shadow-inner bg-gray-50">
            <button
              className="w-full flex justify-between items-center p-4 bg-gray-200 hover:bg-gray-300 rounded-t-xl font-bold text-lg text-gray-800 transition duration-200"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              Advanced Filters
              <span className="text-2xl transform transition-transform duration-200">
                {showAdvancedFilters ? '▲' : '▼'}
              </span>
            </button>
            {showAdvancedFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4">
                {/* Category Multi-select */}
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Categories
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white">
                    {uniqueCategories.map(cat => (
                      <label key={cat} className="flex items-center p-1 hover:bg-gray-100 cursor-pointer rounded-md">
                        <input
                          type="checkbox"
                          checked={tempSelectedCategories.includes(cat)}
                          onChange={() => handleTempCategoryToggle(cat)}
                          className="mr-2 rounded text-blue-500 focus:ring-blue-500"
                        />
                        {cat}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Mechanism Multi-select */}
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Mechanisms
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white">
                    {uniqueMechanisms.map(mech => (
                      <label key={mech} className="flex items-center p-1 hover:bg-gray-100 cursor-pointer rounded-md">
                        <input
                          type="checkbox"
                          checked={tempSelectedMechanisms.includes(mech)}
                          onChange={() => handleTempMechanismToggle(mech)}
                          className="mr-2 rounded text-blue-500 focus:ring-blue-500"
                        />
                        {mech}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Designer Multi-select */}
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Designers
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white">
                    {uniqueDesigners.map(designer => (
                      <label key={designer} className="flex items-center p-1 hover:bg-gray-100 cursor-pointer rounded-md">
                        <input
                          type="checkbox"
                          checked={tempSelectedDesigners.includes(designer)}
                          onChange={() => handleTempDesignerToggle(designer)}
                          className="mr-2 rounded text-blue-500 focus:ring-blue-500"
                        />
                        {designer}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Artist Multi-select */}
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Artists
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white">
                    {uniqueArtists.map(artist => (
                      <label key={artist} className="flex items-center p-1 hover:bg-gray-100 cursor-pointer rounded-md">
                        <input
                          type="checkbox"
                          checked={tempSelectedArtists.includes(artist)}
                          onChange={() => handleTempArtistToggle(artist)}
                          className="mr-2 rounded text-blue-500 focus:ring-blue-500"
                        />
                        {artist}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Publisher Multi-select */}
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Publishers
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white">
                    {uniquePublishers.map(publisher => (
                      <label key={publisher} className="flex items-center p-1 hover:bg-gray-100 cursor-pointer rounded-md">
                        <input
                          type="checkbox"
                          checked={tempSelectedPublishers.includes(publisher)}
                          onChange={() => handleTempPublisherToggle(publisher)}
                          className="mr-2 rounded text-blue-500 focus:ring-blue-500"
                        />
                        {publisher}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Year Published Select */}
                <div>
                  <label htmlFor="modalYearPublished" className="block text-gray-700 font-semibold mb-2">
                    Year Published
                  </label>
                  <select
                    id="modalYearPublished"
                    value={tempSelectedYearPublished}
                    onChange={(e) => setTempSelectedYearPublished(parseInt(e.target.value, 10))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                  >
                    <option value={0}>Any</option>
                    {uniqueYearsPublished.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>


          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={handleResetClick}
              className="px-6 py-3 bg-red-500 text-white font-bold rounded-lg shadow-md hover:bg-red-600 transition duration-200"
            >
              Reset Filters
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-300 text-gray-800 font-bold rounded-lg shadow-md hover:bg-gray-400 transition duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyClick}
              className="px-6 py-3 bg-blue-500 text-white font-bold rounded-lg shadow-md hover:bg-blue-600 transition duration-200"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


// Main App component
function App() {
  const [boardGames, setBoardGames] = useState<BoardGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<BoardGame | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [desiredPlayers, setDesiredPlayers] = useState(0);
  const [desiredTime, setDesiredTime] = useState(0);
  const [selectedWeightCategory, setSelectedWeightCategory] = useState('');
  const [selectedMinAge, setSelectedMinAge] = useState(0);
  const [showTop100, setShowTop100] = useState(false);
  const [showGamesWeSell, setShowGamesWeSell] = useState(false);
  const [showStaffPicks, setShowStaffPicks] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Array<string>>([]);
  const [selectedMechanisms, setSelectedMechanisms] = useState<Array<string>>([]);
  const [selectedDesigners, setSelectedDesigners] = useState<Array<string>>([]);
  const [selectedArtists, setSelectedArtists] = useState<Array<string>>([]);
  const [selectedPublishers, setSelectedPublishers] = useState<Array<string>>([]);
  const [showNCDesignedGames, setShowNCDesignedGames] = useState(false);
  const [selectedYearPublished, setSelectedYearPublished] = useState(0); // Added selectedYearPublished state

  const [showGeneralFilterModal, setShowGeneralFilterModal] = useState(false);


  // Effect to fetch data when the component mounts
  useEffect(() => {
    const fetchBoardGames = async () => {
      try {
        setLoading(true);
        const response = await fetch(GOOGLE_SHEET_DATA_URL);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const csvText = await response.text();
        const parsedGames = parseCSV(csvText);
        setBoardGames(parsedGames);
      } catch (e) {
        console.error("Failed to fetch board games:", e);
        setError("Failed to load board games. Please check the data source and console for details.");
      } finally {
        setLoading(false);
      }
    };

    fetchBoardGames();

  }, []);

  // Effect to control body scrolling when a modal is open
  useEffect(() => {
    if (selectedGame || showGeneralFilterModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = ''; // Reset to default or 'auto'
    }

    // Cleanup function to ensure overflow is reset when component unmounts
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedGame, showGeneralFilterModal]); // Re-run effect when modal states change


  // Function to parse CSV text into an array of game objects
  const parseCSV = (csvText: string) => {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) {
      console.warn("CSV data is empty after splitting lines.");
      return [];
    }

    const headers: Array<keyof BoardGame | string> = lines[0].split(',').map(header => header.trim().toLowerCase());
    const games: Array<BoardGame> = [];

    const csvSplitRegex = /(?:^|,)(?:"((?:[^"]|"")*)"|([^,]*))/g;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values: Array<string> = [];
      let match;

      csvSplitRegex.lastIndex = 0;

      while ((match = csvSplitRegex.exec(line)) !== null) {
        let value = match[1] !== undefined ? match[1] : match[2];
        if (match[1] !== undefined) {
          value = value.replace(/""/g, '"');
        }
        values.push(value.trim());
      }

      while (values.length > headers.length && values[values.length - 1] === '') {
        values.pop();
      }

      if (values.length !== headers.length) {
        console.warn(`Skipping malformed row ${i + 1} (column count mismatch). Expected ${headers.length} columns, but got ${values.length}. Row content: "${line}"`);
        continue;
      }

      const game: {
        id: string,
        name: string,
        minPlayers: number,
        maxPlayers: number,
        difficulty: number,
        minTime: number,
        maxTime: number,
        weight: number,
        rank: number | null,
        average: number | null,
        imageUrl: string,
        shelfLocation: string,
        itemType: string,
        description: string,
        retailPrice: number | null,
        bggRecAgeRange: string | null,
        minAgeValue: number | null,
        staffpicksname: string | null,
        staffpicksdescription: string | null,
        category: string[],
        mechanism: string[],
        designer: string[],
        artist: string[],
        publisher: string[],
        family: string | null,
        own: number,
        yearPublished: number | null // Added yearPublished
      } = {
        id: '',
        name: 'Unknown Game',
        minPlayers: 0,
        maxPlayers: 99,
        difficulty: 0,
        minTime: 0,
        maxTime: 0,
        weight: 1,
        rank: null,
        average: null,
        imageUrl: '',
        shelfLocation: '',
        itemType: '',
        description: '',
        retailPrice: null,
        bggRecAgeRange: null,
        minAgeValue: 0,
        staffpicksname: null,
        staffpicksdescription: null,
        category: [],
        mechanism: [],
        designer: [],
        artist: [],
        publisher: [],
        family: null,
        own: 0,
        yearPublished: null // Initialize yearPublished
      };

      headers.forEach((header, index) => {
        const value = values[index];
        switch (header) {
          case 'objectid': game.id = value; break;
          case 'objectname': game.name = value; break;
          case 'minplayers': game.minPlayers = parseInt(value, 10) || 0; break;
          case 'maxplayers': game.maxPlayers = parseInt(value, 10) || 99; break;
          case 'difficulty': game.difficulty = parseInt(value, 10) || 0; break;
          case 'minplaytime': game.minTime = parseInt(value, 10) || 0; break;
          case 'maxplaytime': game.maxTime = parseInt(value, 10) || 0; break;
          case 'avgweight': game.weight = parseFloat(value) || 1; break;
          case 'rank': game.rank = parseInt(value, 10) || null; break;
          case 'average': game.average = parseFloat(value) || null; break;
          case 'imageurl': game.imageUrl = value; break;
          case 'comment': game.shelfLocation = value; break;
          case 'description': game.description = value; break;
          case 'itemtype':
            if (value.toLowerCase() === 'standalone') { game.itemType = 'Base Game'; }
            else if (value.toLowerCase() === 'expansion') { game.itemType = 'Expansion'; }
            else { game.itemType = value; }
            break;
          case 'retailprice': game.retailPrice = parseFloat(value) || null; break;
          case 'bggrecagerange':
            game.bggRecAgeRange = value || null;
            if (value) {
              const ageMatch = value.match(/^(\d+)/);
              game.minAgeValue = ageMatch ? parseInt(ageMatch[1], 10) : 0;
            } else {
              game.minAgeValue = 0;
            }
            break;
          case 'staffpicksname': game.staffpicksname = value || null; break;
          case 'staffpicksdescription': game.staffpicksdescription = value || null; break;
          case 'category': game.category = parseCommaSeparatedTags(value); break;
          case 'mechanism': game.mechanism = parseCommaSeparatedTags(value); break;
          case 'designer': game.designer = parseCommaSeparatedTags(value); break;
          case 'artist': game.artist = parseCommaSeparatedTags(value); break;
          case 'publisher': game.publisher = parseCommaSeparatedTags(value); break;
          case 'family': game.family = value || null; break;
          case 'own': game.own = parseInt(value, 10) || 0; break;
          case 'yearpublished': game.yearPublished = parseInt(value, 10) || null; break; // Parse yearPublished
          default: break;
        }
      });

      if (game.maxTime === 0 && game.minTime !== 0) {
        game.maxTime = game.minTime;
      }
      if (game.minTime === 0 && game.maxTime === 0) {
        if (game.weight >= 1 && game.weight <= 2) { game.minTime = 15; game.maxTime = 30; }
        else if (game.weight > 2 && game.weight <= 2.5) { game.minTime = 30; game.maxTime = 45; }
        else if (game.weight > 2.5 && game.weight <= 5) { game.minTime = 60; game.maxTime = 120; }
      }

      game.id = game.id || `game-${i}`;
      game.name = game.name || 'Unknown Game';
      game.imageUrl = game.imageUrl || `https://placehold.co/150x150/cccccc/000000?text=${game.name ? game.name.substring(0, 5) : 'Game'}...`;

      if (game.own !== 0) {
        games.push(game);
      }
    }
    console.log(`Successfully parsed ${games.length} games.`);
    return games;
  };

  const uniqueCategories = useMemo(() => getUniqueValues(boardGames, 'category') as Array<string>, [boardGames]);
  const uniqueMechanisms = useMemo(() => getUniqueValues(boardGames, 'mechanism') as Array<string>, [boardGames]);
  const uniqueDesigners = useMemo(() => {
    const allDesigners = getUniqueValues(boardGames, 'designer') as Array<string>;
    // Filter out "JR Honeycutt"
    return allDesigners.filter(designer => designer !== "JR Honeycutt");
  }, [boardGames]);
  const uniqueArtists = useMemo(() => getUniqueValues(boardGames, 'artist') as Array<string>, [boardGames]);
  const uniquePublishers = useMemo(() => getUniqueValues(boardGames, 'publisher') as Array<string>, [boardGames]);
  // Get unique years published and sort them in descending order
  const uniqueYearsPublished = useMemo(() => {
    const years = boardGames.map(game => game.yearPublished).filter((year): year is number => year !== null);
    return [...new Set(years)].sort((a, b) => b - a);
  }, [boardGames]);


  // Filtered games based on all criteria
  const filteredGames = useMemo(() => {
    return boardGames.filter(game => {
      const matchesSearch = (searchTerm === '' || (game.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()));
      const matchesPlayers = desiredPlayers === 0 || (game.minPlayers <= desiredPlayers && game.maxPlayers >= desiredPlayers);
      const matchesTime = desiredTime === 0 || (game.minTime <= desiredTime && game.maxTime >= desiredTime);
      const matchesWeightCategory = selectedWeightCategory === '' ||
        (selectedWeightCategory === 'Low' && game.weight >= 1 && game.weight <= 2) ||
        (selectedWeightCategory === 'Medium' && game.weight > 2 && game.weight <= 2.5) ||
        (selectedWeightCategory === 'High' && game.weight > 2.5 && game.weight <= 5);
      const matchesMinAge = selectedMinAge === 0 || (game.minAgeValue !== null && game.minAgeValue > 0 && game.minAgeValue <= selectedMinAge);
      const matchesTop100 = !showTop100 || (game.rank !== null && game.rank <= 100);
      const matchesGamesWeSell = !showGamesWeSell || (game.retailPrice !== null);
      const matchesStaffPicks = !showStaffPicks || (game.staffpicksname !== null && game.staffpicksname !== '');
      const matchesCategories = selectedCategories.length === 0 || selectedCategories.some(cat => game.category.includes(cat));
      const matchesMechanisms = selectedMechanisms.length === 0 || selectedMechanisms.some(mech => game.mechanism.includes(mech));
      const matchesDesigners = selectedDesigners.length === 0 || selectedDesigners.some(designer => game.designer.includes(designer));
      const matchesArtists = selectedArtists.length === 0 || selectedArtists.some(artist => game.artist.includes(artist));
      const matchesPublishers = selectedPublishers.length === 0 || selectedPublishers.some(publisher => game.publisher.includes(publisher));
      const matchesYearPublished = selectedYearPublished === 0 || (game.yearPublished !== null && game.yearPublished === selectedYearPublished); // Added yearPublished filter

      const matchesNCDesignedGames = !showNCDesignedGames || (game.family && game.family.includes('Organizations: Game Designers of North Carolina'));

      return matchesSearch && matchesPlayers && matchesTime && matchesWeightCategory && matchesMinAge && matchesTop100 && matchesGamesWeSell && matchesStaffPicks && matchesCategories && matchesMechanisms && matchesDesigners && matchesArtists && matchesPublishers && matchesNCDesignedGames && matchesYearPublished; // Include matchesYearPublished
    });
  }, [searchTerm, desiredPlayers, desiredTime, selectedWeightCategory, selectedMinAge, showTop100, showGamesWeSell, showStaffPicks, selectedCategories, selectedMechanisms, selectedDesigners, selectedArtists, selectedPublishers, showNCDesignedGames, selectedYearPublished, boardGames]); // Add selectedYearPublished to dependencies

  // Reset all filters (on main display)
  const handleResetFilters = () => {
    setSearchTerm('');
    setDesiredPlayers(0);
    setDesiredTime(0);
    setSelectedWeightCategory('');
    setSelectedMinAge(0);
    setShowTop100(false);
    setShowGamesWeSell(false);
    setShowStaffPicks(false);
    setSelectedCategories([]);
    setSelectedMechanisms([]);
    setSelectedDesigners([]);
    setSelectedArtists([]);
    setSelectedPublishers([]);
    setShowNCDesignedGames(false);
    setSelectedYearPublished(0); // Reset selectedYearPublished
  };

  // Callback to apply filters from the modal
  const applyFiltersFromModal = (newFilters: CurrentFilters) => {
    setDesiredPlayers(newFilters.desiredPlayers);
    setDesiredTime(newFilters.desiredTime);
    setSelectedWeightCategory(newFilters.selectedWeightCategory);
    setSelectedMinAge(newFilters.selectedMinAge); // Corrected: changed setTempSelectedMinAge to setSelectedMinAge
    setShowTop100(newFilters.showTop100);
    setShowGamesWeSell(newFilters.showGamesWeSell);
    setShowStaffPicks(newFilters.showStaffPicks);
    setSelectedCategories(newFilters.selectedCategories);
    setSelectedMechanisms(newFilters.selectedMechanisms);
    setSelectedDesigners(newFilters.selectedDesigners);
    setSelectedArtists(newFilters.selectedArtists);
    setSelectedPublishers(newFilters.selectedPublishers);
    setShowNCDesignedGames(newFilters.showNCDesignedGames);
    setSelectedYearPublished(newFilters.selectedYearPublished); // Set selectedYearPublished
    setShowGeneralFilterModal(false); // Close modal after applying
  };

  // Handler to blur the input on Enter key press
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur(); // This will unfocus the input, closing the keyboard on mobile
    }
  };


  return (
    // The main container now uses `h-full` and `flex flex-col` to allow internal scrolling.
    // Removed conditional overflow-hidden from here as it's now handled by useEffect on document.body
    <div className="h-full flex flex-col bg-gradient-to-br from-blue-100 to-purple-200 font-inter p-4 sm:p-6 md:p-8">
      {/* Header */}
      <header className="text-center mb-8 bg-white p-6 rounded-xl shadow-lg flex-shrink-0">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-blue-800 mb-2">
          🎲 Tabletop Inn Game Library 📚
        </h1>
        <p className="text-lg text-gray-700">Explore our collection of over 800 board games!</p>
      </header>

      {/* Main content area - always scrollable internally */}
      <main className="flex-1 overflow-y-auto pb-4">
        {/* Search Bar */}
        <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
          <div className="mb-6">
            <label htmlFor="search" className="block text-gray-700 text-lg font-semibold mb-2">
              Search Games
            </label>
            <input
              type="text"
              id="search"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown} // Added onKeyDown handler
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
            />
          </div>

          {/* Filter Buttons Section */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
            <button
              onClick={() => setShowGeneralFilterModal(true)}
              className="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg shadow-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 transition duration-300 ease-in-out text-xl transform hover:scale-105"
            >
              Open All Filters
            </button>
            <button
              onClick={handleResetFilters}
              className="px-8 py-4 bg-red-500 text-white font-bold rounded-lg shadow-xl hover:bg-red-600 focus:outline-none focus:ring-4 focus:ring-red-500 focus:ring-offset-2 transition duration-300 ease-in-out text-xl transform hover:scale-105"
            >
              Reset All Filters
            </button>
          </div>
        </div>

        {/* Display Applied Filters */}
        {(searchTerm !== '' || desiredPlayers !== 0 || desiredTime !== 0 || selectedWeightCategory !== '' || selectedMinAge !== 0 || showTop100 || showGamesWeSell || showStaffPicks || showNCDesignedGames || selectedCategories.length > 0 || selectedMechanisms.length > 0 || selectedDesigners.length > 0 || selectedArtists.length > 0 || selectedPublishers.length > 0 || selectedYearPublished !== 0) && ( // Added selectedYearPublished
          <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">Applied Filters</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {searchTerm !== '' && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                  Search: "{searchTerm}"
                </span>
              )}
              {desiredPlayers !== 0 && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                  Players: {desiredPlayers}
                </span>
              )}
              {desiredTime !== 0 && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                  Time: {desiredTime} min
                </span>
              )}
              {selectedWeightCategory !== '' && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                  Complexity: {selectedWeightCategory}
                </span>
              )}
              {selectedMinAge !== 0 && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                  Min Age: {selectedMinAge}+
                </span>
              )}
              {showTop100 && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                  BGG Top 100
                </span>
              )}
              {showGamesWeSell && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                  Games We Sell
                </span>
              )}
              {showStaffPicks && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                  Staff Picks
                </span>
              )}
              {showNCDesignedGames && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                  Designed in NC
                </span>
              )}
              {selectedYearPublished !== 0 && ( // Display applied year filter
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                  Year: {selectedYearPublished}
                </span>
              )}
              {selectedCategories.length > 0 && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                  Categories: {selectedCategories.join(', ')}
                </span>
              )}
              {selectedMechanisms.length > 0 && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                  Mechanisms: {selectedMechanisms.join(', ')}
                </span>
              )}
              {selectedDesigners.length > 0 && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                  Designers: {selectedDesigners.join(', ')}
                </span>
              )}
              {selectedArtists.length > 0 && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                  Artists: {selectedArtists.join(', ')}
                </span>
              )}
              {selectedPublishers.length > 0 && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                  Publishers: {selectedPublishers.join(', ')}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Game List Display */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            Available Games ({filteredGames.length})
          </h2>
          {loading ? (
            <p className="text-center text-gray-600 text-xl">Loading games...</p>
          ) : error ? (
            <p className="text-center text-red-600 text-xl">{error}</p>
          ) : filteredGames.length === 0 ? (
            <p className="text-center text-gray-600 text-xl">No games match your criteria. Try adjusting your filters!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredGames.map((game, index) => (
                <div
                  key={`${game.id}-${index}`}
                  className="bg-blue-50 p-4 rounded-xl shadow-md flex flex-col items-center text-center transform hover:scale-105 transition duration-300 ease-in-out cursor-pointer"
                  onClick={() => setSelectedGame(game)}
                >
                  <img
                    src={game.imageUrl}
                    alt={game.name}
                    className="w-32 h-32 object-cover rounded-lg mb-4 shadow-sm"
                    onError={(e: any) => {
                      if (!e.target.src.includes('placehold.co')) {
                        e.target.onerror = null;
                        e.target.src = `https://placehold.co/150x150/cccccc/000000?text=${game.name ? game.name.substring(0, 5) : 'Game'}...`;
                      }
                    }}
                  />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{game.name}</h3>

                  {/* BGG Rank - Now conditionally displays "BGG Top 100 Game" above player count */}
                  {game.rank !== null && game.rank <= 100 && (
                    <p className="mb-2 px-2 py-1 bg-yellow-400 text-yellow-900 font-bold rounded-full text-xs sm:text-sm shadow-sm">
                      BGG Top 100 Game
                    </p>
                  )}

                  {/* Staff Pick Badge */}
                  {game.staffpicksname && (
                    <p className="mb-2 px-2 py-1 bg-pink-400 text-pink-900 font-bold rounded-full text-xs sm:text-sm shadow-sm">
                      ⭐ Staff Pick by {game.staffpicksname} ⭐
                    </p>
                  )}

                  {/* Designed in NC Label with Designer Name */}
                  {game.family && game.family.includes('Organizations: Game Designers of North Carolina') && (
                    <p className="mb-2 px-2 py-1 bg-[#155084] text-white font-bold rounded-full text-xs sm:text-sm shadow-sm">
                      Designed in NC by {game.designer.join(', ')}
                    </p>
                  )}

                  <p className="text-gray-700 text-sm mb-1">
                    <span className="font-semibold">Players:</span>{' '}
                    {game.minPlayers === game.maxPlayers
                      ? game.minPlayers
                      : `${game.minPlayers} - ${game.maxPlayers}`}
                  </p>
                  <p className="text-gray-700 text-sm mb-1">
                    <span className="font-semibold">Time:</span>{' '}
                    {game.minTime === game.maxTime
                      ? `${game.minTime} min`
                      : `${game.minTime} - ${game.maxTime} min`}
                  </p>
                  {/* Age Range - Moved under Time and simplified display */}
                  {game.minAgeValue !== null && game.minAgeValue > 0 && ( // Only display if minAgeValue is greater than 0
                    <p className="text-gray-700 text-sm mb-1">
                      <span className="font-semibold">Ages:</span> {game.minAgeValue}+
                    </p>
                  )}
                  {/* Displaying the Complexity with color coding */}
                  {game.weight !== undefined && (
                    <p className="text-gray-700 text-sm mb-1">
                      <span className="font-semibold">Complexity:</span>{' '}
                      <span
                        style={{ color: getColorForWeight(game.weight), fontWeight: 'bold' }}
                        title={`Complexity: ${game.weight.toFixed(1)} out of 5`}
                      >
                        {/* Convert numeric weight to Low/Medium/High for display */}
                        {game.weight >= 1 && game.weight <= 2 ? 'Low' :
                          game.weight > 2 && game.weight <= 2.5 ? 'Medium' :
                            game.weight > 2.5 && game.weight <= 5 ? 'High' :
                              ''}
                    </span>
                  </p>
                )}
                {/* BGG Rating */}
                {game.average !== null && (
                  <p className="text-gray-700 text-sm mb-1">
                    <span className="font-semibold">BGG Rating:</span> {game.average.toFixed(2)}
                  </p>
                )}
                {/* Retail Price - Prominent display */}
                {game.retailPrice !== null && (
                  <p className="text-green-700 text-lg font-extrabold mt-2">
                    Price: ${game.retailPrice.toFixed(2)}
                  </p>
                )}
                {/* Removed Location from game card display */}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>

    {/* Expanded Game Modal */}
    {selectedGame && (
      <div
        className="fixed inset-0 bg-black bg-opacity-75 z-50 overflow-y-auto" // Outer overlay is scrollable
        onClick={() => setSelectedGame(null)} // Click outside to close
      >
        {/* Changed items-start to items-center */}
        <div className="flex items-center justify-center min-h-full p-4">
          <div
            className="bg-white p-6 rounded-xl shadow-2xl max-w-4xl w-full mx-auto relative transform scale-95 md:scale-100 transition-transform duration-300 ease-out max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing modal
          >
            <button
              onClick={() => setSelectedGame(null)}
              // Increased size and padding for easier tapping
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-900 text-4xl font-bold p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors duration-200 leading-none"
              aria-label="Close"
            >
              &times;
            </button>

            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="flex flex-col items-center md:items-start w-full md:w-1/2 lg:w-2/5">
                <img
                  src={selectedGame.imageUrl}
                  alt={selectedGame.name}
                  className="w-full h-auto object-contain rounded-lg shadow-lg mb-4 max-h-64"
                  onError={(e: any) => {
                    if (!e.target.src.includes('placehold.co')) {
                      e.target.onerror = null;
                      e.target.src = `https://placehold.co/400x400/cccccc/000000?text=${selectedGame.name ? selectedGame.name.substring(0, 10) : 'Game'}...`;
                    }
                  }}
                />
                {/* Location - Removed from here */}
                {/* {selectedGame.shelfLocation && (
                  <p className="mt-4 px-4 py-2 bg-blue-200 text-blue-800 font-bold rounded-full text-sm sm:text-base shadow-sm inline-block">
                    Location: {selectedGame.shelfLocation}
                  </p>
                )} */}

                {/* Categories - Moved under image, now horizontally scrollable */}
                {selectedGame.category && selectedGame.category.length > 0 && (
                  <div className="mt-4 w-full text-left">
                    <span className="font-semibold text-gray-700">Categories:</span>
                    <div className="flex flex-nowrap overflow-x-auto gap-2 mt-1 pb-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
                      {selectedGame.category.map((cat, i) => (
                        <span key={i} className="flex-shrink-0 px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mechanisms - Moved under image, now horizontally scrollable */}
                {selectedGame.mechanism && selectedGame.mechanism.length > 0 && (
                  <div className="mt-2 w-full text-left">
                    <span className="font-semibold text-gray-700">Mechanisms:</span>
                    <div className="flex flex-nowrap overflow-x-auto gap-2 mt-1 pb-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
                      {selectedGame.mechanism.map((mech, i) => (
                        <span key={i} className="flex-shrink-0 px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs">
                          {mech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-left flex-1">
                {/* Added pr-12 to prevent title from going behind close button */}
                <h2 className="text-3xl sm:text-4xl font-extrabold text-blue-800 mb-3 pr-12">{selectedGame.name}</h2>
                {selectedGame.rank !== null && selectedGame.rank <= 100 && (
                  <p className="mb-3 px-3 py-1 bg-yellow-400 text-yellow-900 font-bold rounded-full text-sm sm:text-base shadow-sm inline-block">
                    BGG Top 100 Game
                  </p>
                )}

                {/* Staff Pick Details in Modal */}
                {selectedGame.staffpicksname && (
                  <div className="mb-3 p-3 bg-pink-100 rounded-lg shadow-inner">
                    <p className="text-pink-800 font-bold text-lg mb-1">
                      ⭐ Staff Pick by {selectedGame.staffpicksname} ⭐
                    </p>
                    {selectedGame.staffpicksdescription && (
                      <p className="text-pink-700 text-sm italic">
                        "{selectedGame.staffpicksdescription}"
                      </p>
                    )}
                  </div>
                )}

                {/* Designed in NC Label with Designer Name in modal */}
                {selectedGame.family && selectedGame.family.includes('Organizations: Game Designers of North Carolina') && (
                  <p className="mb-3 px-3 py-1 bg-[#155084] text-white font-bold rounded-full text-sm sm:text-base shadow-sm inline-block">
                    Designed in North Carolina by {selectedGame.designer.join(', ')}
                  </p>
                )}

                <p className="text-gray-700 text-lg sm:text-xl mb-2">
                  <span className="font-semibold">Players:</span>{' '}
                  {selectedGame.minPlayers === selectedGame.maxPlayers
                    ? selectedGame.minPlayers
                    : `${selectedGame.minPlayers} - ${selectedGame.maxPlayers}`}
                </p>
                <p className="text-gray-700 text-lg sm:text-xl mb-2">
                  <span className="font-semibold">Time:</span>{' '}
                  {selectedGame.minTime === selectedGame.maxTime
                    ? `${selectedGame.minTime} min`
                    : `${selectedGame.minTime} - ${selectedGame.maxTime} min`}
                </p>
                {/* Age Range in modal - Moved under Time and simplified display */}
                {selectedGame.minAgeValue !== null && selectedGame.minAgeValue > 0 && ( // Only display if minAgeValue is greater than 0
                  <p className="text-gray-700 text-lg sm:text-xl mb-2">
                    <span className="font-semibold">Ages:</span> {selectedGame.minAgeValue}+
                  </p>
                )}
                {selectedGame.weight !== undefined && (
                  <p className="text-gray-700 text-lg sm:text-xl mb-2">
                    <span className="font-semibold">Complexity:</span>{' '}
                    <span
                      style={{ color: getColorForWeight(selectedGame.weight), fontWeight: 'bold' }}
                      title={`Complexity: ${selectedGame.weight.toFixed(1)} out of 5`}
                    >
                      {/* Convert numeric weight to Low/Medium/High for display */}
                      {selectedGame.weight >= 1 && selectedGame.weight <= 2 ? 'Low' :
                        selectedGame.weight > 2 && selectedGame.weight <= 2.5 ? 'Medium' :
                          selectedGame.weight > 2.5 && selectedGame.weight <= 5 ? 'High' :
                            ''}
                    </span>
                  </p>
                )}
                {/* BGG Rating */}
                {selectedGame.average !== null && (
                  <p className="text-gray-700 text-lg sm:text-xl mb-2">
                    <span className="font-semibold">BGG Rating:</span> {selectedGame.average.toFixed(2)}
                  </p>
                )}
                {/* Retail Price - Prominent display in modal */}
                {selectedGame.retailPrice !== null && (
                  <p className="text-green-700 text-xl sm:text-2xl font-extrabold mt-3">
                    Price: ${selectedGame.retailPrice.toFixed(2)}
                  </p>
                )}
                {selectedGame.yearPublished !== null && ( // Display yearPublished in modal
                  <p className="text-gray-700 text-lg sm:text-xl mb-2">
                    <span className="font-semibold">Published:</span> {selectedGame.yearPublished}
                  </p>
                )}
                {/* Description in modal - now scrollable */}
                {selectedGame.description && (
                  <p className="text-gray-600 text-base sm:text-lg mt-4 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap pr-2 border border-gray-300 p-3 rounded-lg bg-gray-50">
                    {selectedGame.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
    }

    {/* General Filter Modal */}
    {
      showGeneralFilterModal && (
        <GeneralFilterModal
          currentFilters={{
            searchTerm,
            desiredPlayers,
            desiredTime,
            selectedWeightCategory,
            selectedMinAge,
            showTop100,
            showGamesWeSell,
            showStaffPicks,
            selectedCategories,
            selectedMechanisms,
            selectedDesigners,
            selectedArtists,
            selectedPublishers,
            showNCDesignedGames,
            selectedYearPublished,
          }}
          uniqueCategories={uniqueCategories}
          uniqueMechanisms={uniqueMechanisms}
          uniqueDesigners={uniqueDesigners}
          uniqueArtists={uniqueArtists}
          uniquePublishers={uniquePublishers}
          uniqueYearsPublished={uniqueYearsPublished} // Pass uniqueYearsPublished
          onApplyFilters={applyFiltersFromModal}
          onClose={() => setShowGeneralFilterModal(false)}
        />
      )
    }

    {/* Footer */}
    <footer className="text-center mt-8 text-gray-600 text-sm flex-shrink-0">
      <p>&copy; 2025 Tabletop Inn. All rights reserved.</p>
    </footer>
  </div >
);
}

export default App;
