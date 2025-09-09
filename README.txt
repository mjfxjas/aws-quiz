AWS CCP Static Quiz v3
=======================
- Auto-fills dropdown from assets/exams.json (edit that file to control the list)
- Parser supports bullet options, <details> answers, and multi-answer (B, E)
- Use S3 static hosting; set Cache-Control as needed

To add exams:
1) Upload your markdowns under assets/
2) Edit assets/exams.json to include their relative paths, e.g.:
   ["assets/practice-exam-1.md", "assets/practice-exam-2.md"]
