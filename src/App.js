// src/App.js
import React, { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter as Router, Routes, Route, useParams, useNavigate, Link } from "react-router-dom";
import { Container, TextField, Button, Typography, Box, Card, CardContent, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";
import { v4 as uuidv4 } from "uuid";
import { log } from "./utils/logger";

// ---------------------- Logger Context ----------------------
const LoggerContext = createContext();
const useLogger = () => useContext(LoggerContext);

const LoggerProvider = ({ children }) => {
  const wrappedLog = (level, message, data = {}) => {
    const stack = "App"; 
    const pkg = "assessment"; 
    log(stack, level, pkg, JSON.stringify({ message, data }));
  };

  return (
    <LoggerContext.Provider value={{ log: wrappedLog }}>
      {children}
    </LoggerContext.Provider>
  );
};


// ---------------------- Utilities ----------------------
const validateURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const generateShortCode = () => Math.random().toString(36).substring(2, 8);

// ---------------------- URL Context ----------------------
const UrlContext = createContext();
const useUrls = () => useContext(UrlContext);

const UrlProvider = ({ children }) => {
  const [urls, setUrls] = useState(() => JSON.parse(localStorage.getItem("urls")) || []);
  const { log } = useLogger();

  useEffect(() => {
    localStorage.setItem("urls", JSON.stringify(urls));
  }, [urls]);

  const addUrl = (longUrl, validity, shortcode) => {
    let code = shortcode || generateShortCode();
    if (urls.find((u) => u.shortCode === code)) {
      code = generateShortCode();
      log("warn", "Shortcode collision, regenerated", { attempted: shortcode });
    }
    const expiry = new Date(Date.now() + (validity || 30) * 60000).toISOString();
    const newUrl = { id: uuidv4(), longUrl, shortCode: code, createdAt: new Date().toISOString(), expiry, clicks: [] };
    setUrls((prev) => [...prev, newUrl]);
    log("info", "URL shortened", { shortCode: code, longUrl });
    return code;
  };

  const addClick = (shortCode, source = "direct", location = "Unknown") => {
    setUrls((prev) =>
      prev.map((u) =>
        u.shortCode === shortCode ? { ...u, clicks: [...u.clicks, { time: new Date().toISOString(), source, location }] } : u
      )
    );
    log("info", "URL clicked", { shortCode });
  };

  return <UrlContext.Provider value={{ urls, addUrl, addClick }}>{children}</UrlContext.Provider>;
};

// ---------------------- Pages ----------------------
const ShortenerPage = () => {
  const [longUrl, setLongUrl] = useState("");
  const [validity, setValidity] = useState("");
  const [shortcode, setShortcode] = useState("");
  const [results, setResults] = useState([]);
  const { addUrl } = useUrls();
  const { log } = useLogger();

  const handleSubmit = () => {
    if (!validateURL(longUrl)) {
      log("error", "Invalid URL entered", { longUrl });
      alert("Invalid URL");
      return;
    }
    const code = addUrl(longUrl, validity ? parseInt(validity) : 30, shortcode.trim() || null);
    setResults((prev) => [...prev, { longUrl, shortUrl: `${window.location.origin}/${code}` }]);
    setLongUrl(""); setValidity(""); setShortcode("");
  };

  return (
    <Container sx={{ mt: 5 }}>
      <Typography variant="h4" gutterBottom>URL Shortener (Assessment)</Typography>
      <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
        <TextField label="Enter Long URL" fullWidth value={longUrl} onChange={(e) => setLongUrl(e.target.value)} />
        <TextField label="Validity (minutes)" type="number" value={validity} onChange={(e) => setValidity(e.target.value)} />
        <TextField label="Custom Shortcode (optional)" value={shortcode} onChange={(e) => setShortcode(e.target.value)} />
        <Button variant="contained" onClick={handleSubmit}>Shorten</Button>
      </Box>
      {results.map((r, i) => (
        <Card key={i} sx={{ mb: 2 }}>
          <CardContent>
            <Typography>Original: {r.longUrl}</Typography>
            <Typography>Short: <a href={r.shortUrl} target="_blank" rel="noreferrer">{r.shortUrl}</a></Typography>
          </CardContent>
        </Card>
      ))}
      <Button component={Link} to="/stats" variant="outlined">View Statistics</Button>
    </Container>
  );
};

const StatisticsPage = () => {
  const { urls } = useUrls();
  return (
    <Container sx={{ mt: 5 }}>
      <Typography variant="h4" gutterBottom>Statistics</Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Short URL</TableCell>
            <TableCell>Original URL</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Expiry</TableCell>
            <TableCell>Clicks</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {urls.map((u) => (
            <TableRow key={u.id}>
              <TableCell><a href={`/${u.shortCode}`} target="_blank" rel="noreferrer">{window.location.origin}/{u.shortCode}</a></TableCell>
              <TableCell>{u.longUrl}</TableCell>
              <TableCell>{new Date(u.createdAt).toLocaleString()}</TableCell>
              <TableCell>{new Date(u.expiry).toLocaleString()}</TableCell>
              <TableCell>{u.clicks.length}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button component={Link} to="/" variant="outlined" sx={{ mt: 2 }}>Back</Button>
    </Container>
  );
};

const RedirectPage = () => {
  const { shortCode } = useParams();
  const { urls, addClick } = useUrls();
  const navigate = useNavigate();
  const { log } = useLogger();

  useEffect(() => {
    const urlObj = urls.find((u) => u.shortCode === shortCode);
    if (!urlObj) {
      log("error", "Shortcode not found", { shortCode });
      alert("Invalid or expired URL");
      navigate("/");
      return;
    }
    if (new Date() > new Date(urlObj.expiry)) {
      log("warn", "URL expired", { shortCode });
      alert("This URL has expired");
      navigate("/");
      return;
    }
    addClick(shortCode, document.referrer || "direct", "Unknown");
    window.location.href = urlObj.longUrl;
  }, [shortCode, urls, addClick, navigate, log]);

  return <Typography>Redirecting...</Typography>;
};

// ---------------------- App Root ----------------------
export default function App() {
  return (
    <LoggerProvider>
      <UrlProvider>
        <Router>
          <Routes>
            <Route path="/" element={<ShortenerPage />} />
            <Route path="/stats" element={<StatisticsPage />} />
            <Route path="/:shortCode" element={<RedirectPage />} />
          </Routes>
        </Router>
      </UrlProvider>
    </LoggerProvider>
  );
}
