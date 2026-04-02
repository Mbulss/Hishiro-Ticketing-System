import React, { useState, useRef, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'

// Import products data directly
const products = [
  // cardigans and jackets
  {
    title: "Hishiro's Signature Y2K Toshiro True Bankai Jacket",
    price: "Rp 899.000",
    originalPrice: "Rp  1.100.000",
    image: "/2.png",
    category: "cardigans-and-jackets",
    discount: "-18%"
  },
  {
    title: "Luffy Boxy Racing Knitted Jacket",
    price: "Rp 419.000",
    image: "/jacket 3.webp",
    category: "cardigans-and-jackets",
    soldOut: true
  },
  {
    title: "Zoro Boxy Racing Knitted Jacket",
    price: "Rp 419.000",
    image: "/jacket 2.webp",
    category: "cardigans-and-jackets",
  },
  // bottom-wear
  {
    title: "Fire Fist Ace Jorts",
    price: "Rp 369.000",
    originalPrice: "Rp 369.000",
    image: "/bottom.webp",
    category: "bottom-wear",
    soldOut: true
  },
  // T-shirts and button-ups
  {
    title: "Hishiro's Signature Dark Kon Button Up [Pre-Order]",
    price: "Rp 319.000",
    originalPrice: "Rp 349.000",
    image: "/1 shirt.webp",
    category: "t-shirts-and-button-ups",
    discount: "-9%",
    soldOut: true
  },
  {
    title: "Hishiro's Signature Honored One Button Up [Pre-Order]",
    price: "Rp 349.000",
    originalPrice: "Rp 289.000",
    image: "/2 shirt.webp",
    category: "t-shirts-and-button-ups",
    discount: "-17%",
    soldOut: true
  },
  // Sweater and hoodies
  {
    title: "Hishiro's Signature Queen Of Curses Knit Sweater (Yula)",
    price: "Rp 226.000",
    originalPrice: "Rp 359.000",
    image: "/1.png",
    category: "sweaters-and-hoodies",
    discount: "-28%",
  },
  // Totebag
  {
    title: "Hishiro's Signature Y2K Toshiro True Bankai Jacket",
    price: "Rp 79.000",
    originalPrice: "Rp 110.000",
    image: "/totebag.webp",
    category: "bags",
    discount: "-28%",
    soldOut: true
  }
];

const categories = [
  { name: 'All', slug: 'all' },
  { name: 'Cardigans and Jackets', slug: 'cardigans-and-jackets' },
  { name: 'Bottom-Wear', slug: 'bottom-wear' },
  { name: 'T-shirts and Button-ups', slug: 't-shirts-and-button-ups' },
  { name: 'Sweaters and Hoodies', slug: 'sweaters-and-hoodies' },
  { name: 'Bags', slug: 'bags' },
  { name: 'Archives', slug: 'archives' },
]

export default function SearchOverlay({ isOpen, onClose }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const navigate = useNavigate()
  const inputRef = useRef(null)
  
  // Disable scrolling when search is open
  useEffect(() => {
    if (isOpen) {
      // Prevent scrolling on the body
      document.body.style.overflow = 'hidden';
    } else {
      // Restore scrolling when search is closed
      document.body.style.overflow = '';
    }
    
    return () => {
      // Cleanup - ensure scrolling is restored if component unmounts
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([])
      setActiveIndex(-1)
      return
    }
    
    const q = searchQuery.toLowerCase().trim();
    
    // Product suggestions - improved search logic
    const productMatches = products.filter(p => {
      // Search in title
      if (p.title.toLowerCase().includes(q)) return true;
      
      // Search in category
      if (p.category.toLowerCase().includes(q)) return true;
      
      // Check for specific keywords
      const keywords = q.split(' ');
      return keywords.some(keyword => 
        keyword.length > 2 && p.title.toLowerCase().includes(keyword)
      );
    }).map(product => {
      // Create a copy of the product to avoid modifying the original data
      const productCopy = { ...product, type: 'product' };
      
      // If the product is sold out, change its display category to Archives
      if (product.soldOut) {
        productCopy.displayCategory = 'Archives';
        productCopy.categorySlug = 'archives';
      } else {
        productCopy.displayCategory = product.category
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        productCopy.categorySlug = product.category;
      }
      
      return productCopy;
    });
    
    // Category suggestions
    const categoryMatches = categories.filter(c => 
      c.name.toLowerCase().includes(q) && c.slug !== 'all'
    ).map(category => ({
      type: 'category',
      name: category.name,
      slug: category.slug
    }));
    
    setSuggestions([
      ...productMatches,
      ...categoryMatches
    ]);
    
    setActiveIndex(-1);
  }, [searchQuery]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!suggestions.length) return
    
    if (e.key === 'ArrowDown') {
      setActiveIndex(i => (i + 1) % suggestions.length)
      e.preventDefault()
    } else if (e.key === 'ArrowUp') {
      setActiveIndex(i => (i - 1 + suggestions.length) % suggestions.length)
      e.preventDefault()
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        handleSuggestionClick(suggestions[activeIndex])
      } else {
        handleSearch(e)
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  const handleSuggestionClick = (item) => {
    if (item.type === 'category') {
      navigate(`/category/${item.slug}`, { replace: true });
    } else if (item.type === 'product') {
      // For sold out items, navigate to archives
      if (item.soldOut) {
        navigate(`/category/archives?product=${encodeURIComponent(item.title)}`, { replace: true });
      } else {
        // Navigate to the specific category or product detail page
        navigate(`/category/${item.categorySlug || item.category}?product=${encodeURIComponent(item.title)}`, { replace: true });
      }
    }
    onClose();
  }

  const handleSearch = (e) => {
    e.preventDefault();
    
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`, { replace: true });
      onClose();
    }
  }

  return (
    <div 
      className={`fixed left-0 right-0 bottom-0 z-50 bg-white border-t transform transition-all duration-300 ease-in-out ${
        isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
      }`} 
      style={{ 
        top: '165px', 
        height: 'auto',
        maxHeight: 'calc(100vh - 150px)',
        overflowY: 'auto'
      }}
    >
      <div className="container mx-auto px-4 md:px-8 py-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-medium text-gray-800">Search for Products</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-black"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search products or categories..."
          className="w-full border border-gray-200 rounded-md py-3 px-4 focus:outline-none focus:border-gray-300 text-gray-600"
          autoFocus
        />
        
        {!searchQuery && (
          <p className="text-gray-500 mt-6 text-center text-sm">
            Start typing to see posts you are looking for.
          </p>
        )}
        
        {searchQuery && suggestions.length > 0 && (
          <ul 
            className="mt-4 divide-y divide-gray-100" 
            style={{ 
              maxHeight: suggestions.length > 5 ? '1000px' : 'auto', 
              overflowY: suggestions.length > 5 ? 'auto' : 'visible' 
            }}
          >
            {suggestions.map((item, idx) => (
              <li
                key={item.type + (item.slug || item.title)}
                className={`py-3 px-2 cursor-pointer hover:bg-gray-50 ${
                  activeIndex === idx ? 'bg-gray-50' : ''
                }`}
                onClick={() => handleSuggestionClick(item)}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                {item.type === 'category' ? (
                  <span className="text-blue-600 font-semibold">Category: {item.name}</span>
                ) : (
                  <div className="flex items-center">
                    {item.image && (
                      <img 
                        src={item.image} 
                        alt={item.title}
                        className="h-12 w-12 object-contain bg-gray-50 mr-3"
                        style={{aspectRatio: "1/1"}}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    <div>
                      <div className="font-medium">{item.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {item.soldOut ? 'Archives' : item.displayCategory}
                        </span>
                        {item.price && (
                          <span className="text-gray-700 text-sm">{item.price}</span>
                        )}
                        {item.originalPrice && item.price && (
                          <span className="text-gray-500 text-xs line-through">{item.originalPrice}</span>
                        )}
                        {item.discount && (
                          <span className="text-green-600 text-xs font-medium">{item.discount}</span>
                        )}
                        {item.soldOut && (
                          <span className="text-red-500 text-xs font-medium">Sold Out</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </li>
            ))}
            <li 
              className="py-3 px-2 text-center text-blue-700 font-semibold cursor-pointer hover:bg-gray-50"
              onClick={() => {
                navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
                onClose()
              }}
            >
              VIEW ALL RESULTS
            </li>
          </ul>
        )}
        
        {searchQuery && suggestions.length === 0 && (
          <p className="text-gray-500 mt-6 text-center text-sm">
            No results found. Try a different search term.
          </p>
        )}
      </div>
    </div>
  )
} 