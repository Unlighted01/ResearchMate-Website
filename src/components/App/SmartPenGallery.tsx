import React, { useState, useEffect } from "react";
import { PenTool } from "lucide-react";
import { getAllItems, StorageItem } from "../../services/storageService";
import { Card, Button } from "../shared/UIComponents";

const SmartPenGallery = () => {
  const [scans, setScans] = useState<StorageItem[]>([]);

  useEffect(() => {
    getAllItems().then((items) => {
      setScans(items.filter((i) => i.deviceSource === "smart_pen"));
    });
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <PenTool className="text-orange-500" /> Smart Pen Gallery
      </h1>

      {scans.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
          <PenTool className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">
            No scans found. Use your smart pen to sync notes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {scans.map((scan) => (
            <Card key={scan.id} className="overflow-hidden group">
              <div className="aspect-[3/4] bg-gray-100 relative">
                {scan.imageUrl ? (
                  <img
                    src={scan.imageUrl}
                    alt="Scan"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <PenTool />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button size="sm" variant="secondary">
                    View OCR
                  </Button>
                </div>
              </div>
              <div className="p-3">
                <h4 className="font-semibold text-sm truncate dark:text-white">
                  {scan.sourceTitle || "Untitled"}
                </h4>
                <p className="text-xs text-gray-500">
                  {new Date(scan.createdAt).toLocaleDateString()}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SmartPenGallery;
