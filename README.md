# Simora

**Simora** is a modern desktop HTTP client inspired by Postman, Hoppscotch, and Insomnia — built using [Wails](https://wails.io/), React, Tailwind CSS, and [shadcn/ui](https://ui.shadcn.com).  
Designed to provide a clean, efficient developer experience with powerful request handling and extensibility.

## ✨ Features

- ✅ Send HTTP requests (GET, POST, PUT, DELETE)
- ✅ View structured response data
- ✅ Export HTTP responses as **JSON** or **CSV**
- ✅ Send Kafka messages directly from the app
- ✅ Modern and minimal **dark UI** (inspired by VS Code)
- ✅ Project → Collection → Request structure
- ✅ Built-in theme variables for easy customization

## 🛠 Tech Stack

| Layer         | Tech                                 |
|---------------|--------------------------------------|
| Backend       | Go + [Wails](https://wails.io/)      |
| Frontend      | React (via Vite)                     |
| Styling       | Tailwind CSS v4                      |
| UI Components | [shadcn/ui](https://ui.shadcn.com)   |
| Messaging     | Apache Kafka (via backend bindings)  |

## 📁 Project Structure

```
simora/
├── backend/        # Go backend logic
├── frontend/       # React + Tailwind UI
├── wails.json      # Wails configuration
├── go.mod          # Go module
├── README.md       # This file
```

## 🚀 Getting Started

> You must have [Wails CLI](https://wails.io/docs/gettingstarted/installation) and Go installed.

```bash
# Clone the repository
git clone git@github.com:BeautifuLie/simora.git
cd simora

# Install frontend dependencies
cd frontend
npm install

# Run the app
cd ..
wails dev
```

## 📦 Status

🚧 This is a **private project** under active development.  
Not licensed for public or commercial use.

## 🔒 License

This codebase is **proprietary** and not open source.  
All rights reserved. Do not distribute or reuse without explicit permission.
