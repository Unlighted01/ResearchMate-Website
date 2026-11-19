"""Source-free safety tests: python -m unittest discover -s scripts -p test_msa_review_pack.py."""
import contextlib
import hashlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from zipfile import ZipFile

from PIL import Image

import build_msa_accuracy_pack as pack


class ReviewPackTests(unittest.TestCase):
    def test_repository_output_rejected_including_ignored_directories(self):
        for output in [pack.ROOT, pack.ROOT / ".tmp" / "review", pack.ROOT / "docs"]:
            with self.subTest(output=output), self.assertRaises(ValueError):
                pack.outside_repo(output)
        self.assertEqual(pack.outside_repo(Path(tempfile.gettempdir())), Path(tempfile.gettempdir()).resolve())

    def test_frozen_source_rejected_before_opening(self):
        with self.assertRaisesRegex(ValueError, "Frozen"):
            pack.build(Path("English Verb Drills.pdf"), Path("absent.json"), Path(tempfile.gettempdir()) / "unused")

    def test_invalid_crop_rejected(self):
        for rect in [(-.1, 0, .2, .2), (0, 0, 0, .2), (.8, 0, .3, .2), (0, .9, .2, .2)]:
            with self.subTest(rect=rect), self.assertRaises(ValueError):
                pack.crop_bounds(rect, 100, 200)
        self.assertEqual(pack.crop_bounds((.1, .2, .3, .4), 100, 200), (10, 40, 40, 120))

    def test_word_centers_use_top_left_normalized_coordinates(self):
        words = [{"text": text, "box": {"x": x, "y": y, "width": .02, "height": .02}}
                 for text, x, y in [("kept", .1, .2), ("left", 0, .2), ("below", .1, .6)]]
        self.assertEqual(pack.region_tokens(words, (.1, .2, .3, .3)), [words[0]])

    def fixture(self, folder):
        source = folder / "synthetic.pdf"
        source.write_bytes(b"synthetic source - not a corpus fixture")
        cache = folder / "cache.json"
        data = {"source": {"sourceHash": hashlib.sha256(source.read_bytes()).hexdigest()}, "dpi": 144,
                "language": "eng", "engineVersion": "synthetic-test", "pages": [
                    {"pageNumber": n, "text": "MACHINE_SENTINEL_42", "words": [
                        {"text": "MACHINE_SENTINEL_42", "box": {"x": .2, "y": .2, "width": .1, "height": .05}}]}
                    for n in range(1, 157)]}
        cache.write_text(json.dumps(data), encoding="utf-8")
        return source, cache, data

    def test_hash_mismatch_stops_before_rendering(self):
        with tempfile.TemporaryDirectory(prefix="msa-script-test-") as directory:
            folder = Path(directory)
            source, cache, _ = self.fixture(folder)
            source.write_bytes(b"changed")
            with patch.object(pack.subprocess, "run") as render, self.assertRaisesRegex(ValueError, "hash"):
                pack.build(source, cache, folder / "output")
            render.assert_not_called()
            self.assertFalse((folder / "output").exists())

    def test_existing_reviewer_work_not_overwritten(self):
        with tempfile.TemporaryDirectory(prefix="msa-script-test-") as directory:
            output = Path(directory)
            marker = output / "my-labels.json"
            marker.write_text("preserve")
            with self.assertRaisesRegex(ValueError, "never overwritten"):
                pack.build(output / "absent.pdf", output / "absent.json", output)
            self.assertEqual(marker.read_text(), "preserve")

    def test_generated_pack_separates_truth_and_machine_and_archives_no_source(self):
        with tempfile.TemporaryDirectory(prefix="msa-script-test-") as directory:
            folder = Path(directory)
            source, cache, _ = self.fixture(folder)
            output = folder / "review"

            def render(command, **_):
                Image.new("RGB", (300, 400), "white").save(command[-1] + ".png")

            with patch.object(pack, "SAMPLES", [(1, "math", "Synthetic fraction", [(0, 0, 1, 1)])]), \
                    patch.object(pack.shutil, "which", return_value="synthetic-renderer"), \
                    patch.object(pack.subprocess, "run", side_effect=render), contextlib.redirect_stdout(io.StringIO()):
                pack.build(source, cache, output)
            human = (output / "review.html").read_text(encoding="utf-8")
            machine = (output / "ocr.html").read_text(encoding="utf-8")
            self.assertNotIn("MACHINE_SENTINEL_42", human)
            self.assertIn("MACHINE_SENTINEL_42", machine)
            self.assertNotIn("<img", machine)
            labels = json.loads((output / "labels-template.json").read_text())
            region = labels["regions"][0]
            self.assertEqual(region["status"], "unchecked")
            for field in ["transcription", "math", "digits", "keys", "notes"]:
                self.assertEqual(region[field], "")
            self.assertFalse(region["noKeys"])
            with ZipFile(output.with_suffix(".zip")) as archive:
                self.assertIn("review.html", archive.namelist())
                self.assertIn("ocr.html", archive.namelist())
                self.assertFalse(any(name.endswith(".pdf") for name in archive.namelist()))


if __name__ == "__main__":
    unittest.main()
