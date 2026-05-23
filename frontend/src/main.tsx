import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

import "./index.css";
import App from "./App";
import { ChatPage } from "./chat/components/ChatPage";
import { DashboardPage } from "./dashboard/components/DashboardPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      // Single ChatPage layout so / → /chat/:id does not remount (would drop SSE state).
      {
        element: <ChatPage />,
        children: [{ index: true }, { path: "chat/:conversationId" }],
      },
      { path: "dashboard", element: <DashboardPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
