"""
Loads datasets from HuggingFace and indexes them into ChromaDB:
1. bitext/Bitext-customer-support-llm-chatbot-training-dataset -> Knowledge Base
2. Console-AI/IT-helpdesk-synthetic-tickets -> Ticket examples + KB
"""
import logging
import hashlib
from typing import List, Dict

from utils.vector_store import add_documents, get_doc_count

logger = logging.getLogger(__name__)

# Fallback knowledge base if HuggingFace is unavailable
FALLBACK_KB = [
    {
        "instruction": "My VPN is not connecting",
        "response": "To fix VPN connection issues: 1) Check your internet connection is working. 2) Verify VPN credentials are correct. 3) Try disconnecting and reconnecting. 4) Clear VPN cache and restart the client. 5) Check if your firewall is blocking the VPN port (usually 1194 for OpenVPN or 443 for SSL VPN). 6) Contact IT if the issue persists.",
        "category": "Network",
    },
    {
        "instruction": "How do I reset my password?",
        "response": "To reset your password: 1) Go to the company SSO portal at sso.company.com. 2) Click 'Forgot Password'. 3) Enter your work email address. 4) Check your email for the reset link (check spam folder too). 5) Follow the link to create a new password. Password must be 12+ characters with uppercase, lowercase, numbers, and symbols.",
        "category": "Account",
    },
    {
        "instruction": "My email is not syncing on mobile",
        "response": "To fix email sync issues on mobile: 1) Go to Settings > Mail > Accounts. 2) Delete your work email account. 3) Re-add it using Microsoft Exchange/ActiveSync settings: Server: mail.company.com, Domain: COMPANY. 4) Ensure your device has a passcode set (required for security policy). 5) Allow up to 15 minutes for initial sync.",
        "category": "Email",
    },
    {
        "instruction": "Printer is not printing",
        "response": "To troubleshoot printer issues: 1) Check if the printer is powered on and has paper. 2) Clear the print queue (Control Panel > Devices and Printers > right-click printer > See what's printing > Cancel all). 3) Restart the Print Spooler service (services.msc > Print Spooler > Restart). 4) Remove and re-add the printer. 5) Download the latest driver from the manufacturer's website.",
        "category": "Hardware",
    },
    {
        "instruction": "My computer is running very slowly",
        "response": "To improve computer performance: 1) Restart your computer (clears RAM and temp files). 2) Check Task Manager (Ctrl+Shift+Esc) for processes using high CPU/RAM. 3) Run Windows Update and restart. 4) Check disk space - ensure C: drive has at least 15% free space. 5) Run a malware scan using your company's antivirus. 6) Disable startup programs you don't need. 7) If issue persists, submit a ticket for hardware evaluation.",
        "category": "Hardware",
    },
    {
        "instruction": "How do I set up Microsoft Teams?",
        "response": "To set up Microsoft Teams: 1) Download Teams from teams.microsoft.com or Microsoft Store. 2) Sign in with your work email (user@company.com). 3) Enter your work password when prompted. 4) Complete MFA if required. 5) Allow microphone and camera permissions. 6) Test audio/video in Settings > Devices before your first meeting.",
        "category": "Software",
    },
    {
        "instruction": "I cannot access a shared drive or folder",
        "response": "To fix shared drive access: 1) Verify you are connected to the corporate network or VPN. 2) Try accessing via UNC path: \\\\server-name\\share-name. 3) Check with your manager that you have been granted access. 4) Clear Windows credentials (Control Panel > Credential Manager > Windows Credentials > remove entries for the server). 5) Submit a ticket with the exact path you need access to.",
        "category": "Network",
    },
    {
        "instruction": "How do I set up multi-factor authentication MFA?",
        "response": "To set up MFA: 1) Download the Microsoft Authenticator app on your phone. 2) Go to aka.ms/mfasetup in a browser. 3) Sign in with your work credentials. 4) Choose 'Mobile app' as verification method. 5) Open Authenticator, tap '+', scan the QR code shown. 6) Enter the 6-digit code to verify. 7) MFA will now be required for all company logins.",
        "category": "Security",
    },
    {
        "instruction": "My laptop screen is flickering or has display issues",
        "response": "To fix display/screen issues: 1) Right-click desktop > Display Settings > Advanced display settings > check refresh rate (set to 60Hz or native rate). 2) Update display drivers: Device Manager > Display Adapters > right-click > Update driver. 3) Check the cable connection if using an external monitor. 4) Try a different cable or port. 5) If the laptop screen itself flickers, this may be a hardware issue - submit a ticket for hardware inspection.",
        "category": "Hardware",
    },
    {
        "instruction": "How do I backup my files?",
        "response": "Company file backup options: 1) OneDrive: All files in your Documents, Desktop, and Pictures folders sync automatically if OneDrive backup is enabled. Check OneDrive icon in taskbar > Settings > Backup. 2) Network Drive: Save files to your H:\\ drive which is backed up nightly. 3) SharePoint: Team files should be stored in your department's SharePoint site. Never store important files only on local C:\\ drive.",
        "category": "Data Management",
    },
    {
        "instruction": "Software installation request",
        "response": "To request software installation: 1) Check if the software is available in the Company Software Portal (Software Center on Windows). 2) If not listed, submit a software request ticket with: software name, version, business justification, vendor website. 3) IT will evaluate licensing and security compliance. 4) Standard approvals take 3-5 business days. 5) For urgent needs, mark ticket as High priority with manager approval.",
        "category": "Software",
    },
    {
        "instruction": "I am locked out of my account",
        "response": "Account lockout resolution: 1) Wait 15 minutes - accounts auto-unlock after a lockout period. 2) Call the IT Helpdesk for immediate unlock: ext. 4357. 3) Common causes: typing wrong password multiple times, phone still using old password for Exchange sync, saved credentials in a browser. 4) After unlock, immediately update your password on all devices. 5) If locked out frequently, consider using a password manager.",
        "category": "Account",
    },
]

TICKET_CATEGORIES = [
    "Network", "Email", "Hardware", "Software", "Account",
    "Security", "VPN", "Printer", "Data Management", "General", "Other"
]


async def load_datasets_on_startup():
    """Load datasets into ChromaDB if not already loaded."""
    count = get_doc_count()
    if count > 50:
        logger.info(f" Vector store already has {count} documents. Skipping reload.")
        return

    logger.info(" Loading datasets into vector store...")

    # Try loading from HuggingFace, fall back to local data
    bitext_loaded = await _load_bitext_dataset()
    if not bitext_loaded:
        await _load_fallback_kb()

    await _load_ticket_examples()
    logger.info(f" Dataset loading complete. Total docs: {get_doc_count()}")


async def _load_bitext_dataset() -> bool:
    """Load Bitext customer support dataset."""
    try:
        from datasets import load_dataset
        logger.info("Loading Bitext dataset from HuggingFace...")
        dataset = load_dataset(
            "bitext/Bitext-customer-support-llm-chatbot-training-dataset",
            split="train",
            trust_remote_code=True,
        )
        # Sample first 500 rows for speed
        sample = dataset.select(range(min(500, len(dataset))))

        texts = []
        metadatas = []
        ids = []

        for row in sample:
            instruction = row.get("instruction", "") or row.get("input", "")
            response = row.get("response", "") or row.get("output", "")
            if not instruction or not response:
                continue

            combined = f"Q: {instruction}\nA: {response}"
            texts.append(combined)
            metadatas.append({
                "source": "bitext",
                "category": row.get("category", "General"),
                "type": "qa_pair",
            })
            ids.append(hashlib.md5(combined.encode()).hexdigest()[:16])

        if texts:
            # Batch upsert
            batch_size = 100
            for i in range(0, len(texts), batch_size):
                await add_documents(texts[i:i+batch_size], metadatas[i:i+batch_size], ids[i:i+batch_size])
            logger.info(f" Loaded {len(texts)} Bitext QA pairs")
            return True

    except Exception as e:
        logger.warning(f" Could not load Bitext dataset: {e}. Using fallback KB.")
        return False


async def _load_fallback_kb():
    """Load local fallback knowledge base."""
    texts = []
    metadatas = []
    ids = []
    for item in FALLBACK_KB:
        combined = f"Q: {item['instruction']}\nA: {item['response']}"
        texts.append(combined)
        metadatas.append({"source": "local_kb", "category": item["category"], "type": "qa_pair"})
        ids.append(hashlib.md5(combined.encode()).hexdigest()[:16])

    await add_documents(texts, metadatas, ids)
    logger.info(f" Loaded {len(texts)} fallback KB entries")


async def _load_ticket_examples():
    """Load IT helpdesk ticket examples as KB articles."""
    try:
        from datasets import load_dataset
        logger.info("Loading IT helpdesk tickets dataset...")
        dataset = load_dataset(
            "Console-AI/IT-helpdesk-synthetic-tickets",
            split="train",
            trust_remote_code=True,
        )
        texts = []
        metadatas = []
        ids = []
        for row in dataset:
            subject = row.get("subject", "")
            description = row.get("description", "")
            category = row.get("category", "General")
            priority = row.get("priority", "Medium")
            if not description:
                continue

            combined = f"IT Issue: {subject}\nDetails: {description}"
            texts.append(combined)
            metadatas.append({
                "source": "it_tickets",
                "category": category,
                "priority": priority,
                "type": "ticket",
            })
            ids.append(row.get("id", hashlib.md5(combined.encode()).hexdigest()[:8]))

        if texts:
            await add_documents(texts, metadatas, ids)
            logger.info(f" Loaded {len(texts)} IT ticket examples")

    except Exception as e:
        logger.warning(f" Could not load ticket dataset: {e}")
