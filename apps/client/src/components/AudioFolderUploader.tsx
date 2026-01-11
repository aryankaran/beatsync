"use client";

import { uploadAudioFile } from "@/lib/api";
import { cn, trimFileName } from "@/lib/utils";
import { useCanMutate } from "@/store/global";
import { useRoomStore } from "@/store/room";
import { FolderUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import pLimit from "p-limit";

const ACCEPTED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/aac",
  "audio/ogg",
  "audio/webm",
  "audio/flac",
  ".mp3",
  ".wav",
  ".m4a",
  ".aac",
  ".ogg",
  ".webm",
  ".flac",
];

export const AudioFolderUploader = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ total: 0, completed: 0 });
  const canMutate = useCanMutate();
  const roomId = useRoomStore((state) => state.roomId);

  const isDisabled = !canMutate;

  const handleFolderUpload = async (files: FileList) => {
    if (isDisabled) return;

    const audioFiles = Array.from(files).filter(file => 
      ACCEPTED_AUDIO_TYPES.some(type => file.type.startsWith(type.replace(".*", "")) || file.name.endsWith(type))
    );

    if (audioFiles.length === 0) {
      toast.error("No audio files found in the selected folder.");
      return;
    }

    setIsUploading(true);
    setUploadProgress({ total: audioFiles.length, completed: 0 });

    const limit = pLimit(4); // Limit to 4 parallel uploads

    const uploadPromises = audioFiles.map(file => {
      return limit(async () => {
        try {
          await uploadAudioFile({
            file,
            roomId,
          });
          setUploadProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
        } catch (err) {
          console.error(`Error uploading ${file.name}:`, err);
          toast.error(`Failed to upload ${trimFileName(file.name)}`);
        }
      });
    });

    await Promise.all(uploadPromises);

    setIsUploading(false);
    toast.success(`Finished uploading ${audioFiles.length} files.`);
  };

  const onInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isDisabled) return;
    const files = event.target.files;
    if (!files || files.length === 0) return;
    handleFolderUpload(files);
    // Reset file input
    event.target.value = "";
  };

  return (
    <div
      className={cn(
        "border border-neutral-700/50 rounded-md mx-2 transition-all overflow-hidden",
        isDisabled
          ? "bg-neutral-800/20 opacity-50"
          : "bg-neutral-800/30 hover:bg-neutral-800/50"
      )}
      title={
        isDisabled ? "Admin-only mode - only admins can upload" : undefined
      }
    >
      <label
        htmlFor="folder-upload"
        className={cn("block w-full", isDisabled ? "" : "cursor-pointer")}
      >
        <div className="p-3 flex items-center gap-3">
          <div
            className={cn(
              "p-1.5 rounded-md flex-shrink-0",
              isDisabled
                ? "bg-neutral-600 text-neutral-400"
                : "bg-primary-700 text-white"
            )}
          >
            <FolderUp className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">
              {isUploading
                ? `Uploading... (${uploadProgress.completed}/${uploadProgress.total})`
                : "Upload folder"}
            </div>
            {!isUploading && (
              <div
                className={cn(
                  "text-xs truncate",
                  isDisabled ? "text-neutral-500" : "text-neutral-400"
                )}
              >
                {isDisabled
                  ? "Must be an admin to upload"
                  : "Add all music from a folder"}
              </div>
            )}
          </div>
        </div>
      </label>

      <input
        id="folder-upload"
        type="file"
        onChange={onInputChange}
        disabled={isUploading || isDisabled}
        className="hidden"
        webkitdirectory=""
        multiple
      />
    </div>
  );
};
