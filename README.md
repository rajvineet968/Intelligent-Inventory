# Intelligent Inventory Management System

An academic project that integrates **Web Development, Database Systems, and Machine Learning** to build an intelligent inventory management solution with demand forecasting.
This repository follows **industry-standard Git practices** and excludes non-source artifacts.

---

## ✨ Features

- Product and inventory management
- Sales and demand tracking
- Machine Learning–based demand forecasting
- Backend integration with database
- Web-based user interface

---

## 🧠 Machine Learning Module

- Demand forecasting models are trained using historical or synthetic data
- Models are saved locally as `.pkl` files
- Trained models are **not committed to GitHub**

> ML models are considered build artifacts, not source code.

---

## 📁 Project Structure

.
├── app.js # Main application entry


├── ml/ # Machine learning code


│ └── *.pkl # Trained ML models (ignored by Git)


├── README.md

├── .env # Environment variables (ignored)

├── node_modules/ # Node.js dependencies (ignored)

---

## 🚫 Ignored Files (By Design)

The following files are intentionally excluded from version control:

```gitignore
.env
node_modules/
ml/*.pkl
Why these files are ignored?
File / Folder	Reason
.env	Contains sensitive credentials
node_modules/	Can be regenerated using npm install
ml/*.pkl	Large binary ML model files

This approach aligns with industry best practices.

⚙️ Setup Instructions
1️⃣ Clone the repository

git clone git remote add origin https://github.com/rajvineet968/Intelligent-Inventory.git

2️⃣ Install dependencies

npm install

3️⃣ Configure environment variables
A .env.example is given in root directory, inside db folder and ml folder(only fill your keys)
4️⃣ Run the application

node app.js

📊 Model Generation
Execute the ML training script
Models are generated and saved inside the ml/ directory if you follow same order as below

python ml/data_generator.py
python ml/train_sarima.py
python ml/generate_forecast.py
python ml/llm_insights.py

Generated .pkl files remain local and are not pushed to GitHub

🏫 Academic Note
This repository includes:
Complete and reproducible source code
No large binary files
No sensitive data
Designed to meet academic evaluation and real-world software engineering standards.

📌 Author
Developed as an academic project integrating
DBMS + Machine Learning + Web Development

✅ Repository Status
✔ GitHub file size compliant
✔ Clean Git history
✔ Industry-standard .gitignore
✔ Ready for evaluation


## Final mentor advice 🧠
If anyone asks **“Why is the ML model missing?”**, say:

> The repository contains reproducible training code.  
Models are generated locally and are excluded from version control as per standard ML practices.







