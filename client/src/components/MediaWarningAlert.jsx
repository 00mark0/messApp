import React, { useState, useEffect } from "react";

const MediaWarningAlert = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);

  useEffect(() => {
    const hideAlert = localStorage.getItem("hideMediaWarning");
    if (!hideAlert) {
      setIsVisible(true);
    }
  }, []);

  const handleClose = () => {
    if (doNotShowAgain) {
      localStorage.setItem("hideMediaWarning", "true");
    }
    setIsVisible(false);
  };

  return (
    <div
      className={`fixed top-4 right-4 max-w-sm w-full bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 shadow-lg rounded transform transition-transform duration-500 ${
        isVisible
          ? "translate-y-0 opacity-100"
          : "-translate-y-full opacity-0 pointer-events-none"
      }`}
      aria-live="assertive"
      role="alert"
    >
      {isVisible && (
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {/* Warning Icon */}
            <svg
              className="h-6 w-6 text-yellow-700"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm">
              <strong>Important:</strong> This app deletes media files that are
              not contained in the last 50 messages. Download the files if you
              want to keep them.
            </p>
            <div className="mt-2 flex items-center">
              <input
                type="checkbox"
                id="doNotShow"
                checked={doNotShowAgain}
                onChange={(e) => setDoNotShowAgain(e.target.checked)}
                className="h-4 w-4 text-yellow-600 border-gray-300 rounded"
              />
              <label
                htmlFor="doNotShow"
                className="ml-2 block text-sm text-yellow-700"
              >
                Do not show again
              </label>
            </div>
            <div className="mt-3">
              <button
                onClick={handleClose}
                className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 focus:outline-none"
                aria-label="Close alert"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaWarningAlert;
