import React from "react";

const MediaPreview = ({ mediaUrl, onClick }) => {
  const isImage = /\.(jpeg|jpg|gif|png)$/.test(mediaUrl);
  const isVideo = /\.(mp4|webm|ogg)$/.test(mediaUrl);

  const fullMediaUrl = `${import.meta.env.VITE_REACT_APP_API_URL}${mediaUrl}`;

  return (
    <div className="mt-2">
      {isImage && (
        <img
          src={fullMediaUrl}
          alt="Message Media"
          className="max-w-full h-auto rounded cursor-pointer"
          onClick={() => onClick(fullMediaUrl)}
        />
      )}
      {isVideo && (
        <video controls className="max-w-full h-auto rounded">
          <source src={fullMediaUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      )}
    </div>
  );
};

export default MediaPreview;
