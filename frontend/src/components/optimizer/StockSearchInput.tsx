import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
import { API_BASE } from "@/features/optimizer/config";

interface StockSuggestion {
  ticker: string;
  symbol: string;
  name: string;
  exchange: "NSE" | "BSE";
}

interface StockSearchInputProps {
  value: string;
  name: string;
  onChange: (ticker: string, name: string) => void;
  onRemove: () => void;
  canRemove: boolean;
  slotKey: string;
}

const StockSearchInput: React.FC<StockSearchInputProps> = ({
  value,
  name,
  onChange,
  onRemove,
  canRemove,
  slotKey,
}) => {
  const [inputVal, setInputVal] = useState(value);
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
  const [showDrop, setShowDrop] = useState(false);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setShowDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setInputVal(value);
  }, [value]);

  const search = useCallback(async (q: string) => {
    if (!q || q.length < 1) {
      setSuggestions([]);
      setShowDrop(false);
      return;
    }
    setSearching(true);
    try {
      const r = await fetch(`${API_BASE}/api/searchStocks?q=${encodeURIComponent(q)}`);
      const d = await r.json();
      setSuggestions(d.results ?? []);
      setShowDrop((d.results ?? []).length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.toUpperCase();
    setInputVal(v);
    onChange(v, "");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 280);
  };

  const handleSelect = (s: StockSuggestion) => {
    setInputVal(s.ticker);
    onChange(s.ticker, s.name);
    setSuggestions([]);
    setShowDrop(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setShowDrop(false);
  };

  const borderColor = focused ? "hsl(var(--foreground) / 0.35)" : "hsl(var(--border))";

  return (
    <div ref={containerRef} style={{ position: "relative", flex: 1 }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <Search
          size={13}
          style={{
            position: "absolute",
            left: "10px",
            color: "hsl(var(--muted-foreground))",
            pointerEvents: "none",
            flexShrink: 0,
          }}
        />
        <input
          id={slotKey}
          type="text"
          autoComplete="off"
          placeholder="Search stock — name or ticker"
          value={inputVal}
          onChange={handleInput}
          onFocus={() => {
            setFocused(true);
            if (suggestions.length) setShowDrop(true);
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          style={{
            width: "100%",
            height: "38px",
            paddingLeft: "30px",
            paddingRight: searching ? "30px" : "10px",
            background: "hsl(var(--card) / 0.6)",
            backdropFilter: "blur(8px)",
            border: `1px solid ${borderColor}`,
            borderRadius: showDrop ? "7px 7px 0 0" : "7px",
            fontSize: "13.5px",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.03em",
            color: "hsl(var(--foreground))",
            outline: "none",
            transition: "border-color 0.15s ease, box-shadow 0.15s ease",
            boxShadow: focused ? "0 0 0 3px hsl(var(--foreground) / 0.06)" : "none",
          }}
        />
        {searching && (
          <Loader2
            size={11}
            style={{
              position: "absolute",
              right: "10px",
              color: "hsl(var(--muted-foreground))",
              animation: "spin 0.8s linear infinite",
            }}
          />
        )}
      </div>

      {name && !showDrop && (
        <div style={{ marginTop: "3px", paddingLeft: "30px" }}>
          <span
            style={{
              fontSize: "11px",
              color: "hsl(var(--muted-foreground))",
              fontFamily: "'Inter', sans-serif",
              fontWeight: 300,
              letterSpacing: "-0.01em",
            }}
          >
            {name}
          </span>
        </div>
      )}

      {showDrop && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "hsl(var(--card) / 0.97)",
            backdropFilter: "blur(12px)",
            border: `1px solid ${borderColor}`,
            borderTop: "none",
            borderRadius: "0 0 7px 7px",
            boxShadow: "0 8px 24px hsl(var(--foreground) / 0.08)",
            overflow: "hidden",
          }}
        >
          {suggestions.map((s, i) => (
            <button
              key={s.symbol}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(s);
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                borderTop: i > 0 ? "1px solid hsl(var(--border) / 0.5)" : "none",
                textAlign: "left",
                transition: "background 0.1s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "hsl(var(--secondary) / 0.7)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "hsl(var(--foreground))",
                    letterSpacing: "0.02em",
                  }}
                >
                  {s.ticker}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    color: "hsl(var(--muted-foreground))",
                    fontWeight: 300,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {s.name}
                </span>
              </div>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "0.05em",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: s.exchange === "NSE" ? "var(--blue-subtle)" : "hsl(var(--muted) / 0.5)",
                  color: s.exchange === "NSE" ? "var(--blue)" : "hsl(var(--muted-foreground))",
                  flexShrink: 0,
                  border: s.exchange === "NSE" ? "1px solid var(--blue-border)" : "1px solid hsl(var(--border))",
                }}
              >
                {s.exchange}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default StockSearchInput;
