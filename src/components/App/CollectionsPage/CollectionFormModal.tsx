// ============================================
// CollectionFormModal.tsx - Create / Edit Collection Modal
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import {
  COLLECTION_COLORS,
} from "../../../services/collectionsService";
import { Button, Input, Modal } from "../../shared/ui";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface CollectionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  formName: string;
  formDescription: string;
  formColor: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onSubmit: () => void;
}

// ============================================
// PART 3: COMPONENT
// ============================================

const CollectionFormModal: React.FC<CollectionFormModalProps> = ({
  isOpen,
  onClose,
  mode,
  formName,
  formDescription,
  formColor,
  onNameChange,
  onDescriptionChange,
  onColorChange,
  onSubmit,
}) => {
  const title = mode === "create" ? "New Collection" : "Edit Collection";
  const submitLabel = mode === "create" ? "Create" : "Save Changes";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <Input
          label="Name"
          value={formName}
          onChange={(e) => onNameChange(e.target.value)}
        />
        <Input
          label="Description"
          value={formDescription}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
        <div>
          <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
            Color
          </label>
          <div className="flex gap-2 flex-wrap">
            {COLLECTION_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => onColorChange(c.value)}
                style={{ backgroundColor: c.value }}
                aria-label={`Select ${c.name} color`}
                title={c.name}
                className={`w-8 h-8 rounded-full ${
                  formColor === c.value
                    ? "ring-2 ring-offset-2 ring-gray-400"
                    : ""
                }`}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-4">
          <Button className="w-full" onClick={onSubmit}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default CollectionFormModal;
