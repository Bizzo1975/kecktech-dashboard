"""Private local finance screen. No network listener or provider connection."""

from __future__ import annotations

import argparse
import os
import sqlite3
import tkinter as tk
from datetime import date, datetime, timezone
from pathlib import Path
from tkinter import filedialog, messagebox, ttk

from .core import (
    ECONOMIC_TYPES, GOAL_SCOPES, InputError, backup_database, database_health,
    add_schedule, import_budget, init_db, list_goals, list_schedules,
    list_transactions, open_db, reconcile, review_transaction, set_goal, set_limit,
    set_schedule_active,
)
from .viewmodel import bill_view, connection_view, month_view
from .payments import link_bill_payment, unlink_bill_payment
from .insights import savings_signals
from .statements import list_statement_checks
from .marketlist import pantry_view
from .business import business_year_view, export_business_year
from .resources import resource_month_view


def dollars(amount: int | None) -> str:
    if amount is None:
        return "Not available"
    sign = "−" if amount < 0 else ""
    whole, fractional = divmod(abs(amount), 100)
    return f"{sign}${whole:,}.{fractional:02d}"


def default_database() -> Path:
    base = Path(os.environ.get("LOCALAPPDATA") or Path.home() / ".local" / "share")
    return base / "Kecktech" / "Finance" / "finance.db"


class FinanceApp(tk.Tk):
    def __init__(self, db: sqlite3.Connection):
        super().__init__()
        self.db = db
        self.title("Finance and Resource Hub — local")
        self.geometry("1400x850")
        self.minsize(1100, 680)
        self.protocol("WM_DELETE_WINDOW", self.close)
        self.bind("<Control-r>", lambda _event: self.refresh())
        self.bind("<Control-b>", lambda _event: self.backup_data())
        self.month = tk.StringVar(value=date.today().strftime("%Y-%m"))
        self.scope = tk.StringVar(value="All")
        self.actual_note = tk.StringVar()
        self.connection_note = tk.StringVar()
        self.metrics = {name: tk.StringVar() for name in (
            "planned_income", "planned_expense", "reviewed_income", "reviewed_expense",
        )}
        self.tx_rows: dict[str, dict] = {}
        self.review_type = tk.StringVar()
        self.review_category = tk.StringVar()
        self.payment_amount = tk.StringVar()
        self.payment_choice = tk.StringVar()
        self.payment_options: dict[str, tuple[int, int]] = {}
        self.overview_status = tk.StringVar()
        self.bill_status = tk.StringVar()
        self.coverage_status = tk.StringVar()
        self.insight_status = tk.StringVar()
        self.statement_status = tk.StringVar()
        self.pantry_status = tk.StringVar()
        self.inventory_status = tk.StringVar()
        self.business_status = tk.StringVar()
        self.resource_status = tk.StringVar()
        self.schedule_kind = tk.StringVar(value="bill")
        self.schedule_name = tk.StringVar()
        self.schedule_amount = tk.StringVar()
        self.schedule_frequency = tk.StringVar(value="monthly")
        self.schedule_date = tk.StringVar()
        self.schedule_category = tk.StringVar()
        self.reconcile_account = tk.StringVar()
        self.reconcile_start = tk.StringVar()
        self.reconcile_end = tk.StringVar()
        self.reconcile_opening = tk.StringVar()
        self.reconcile_closing = tk.StringVar()
        self.reconcile_result = tk.StringVar(value="No statement balance check run.")
        self.limit_category = tk.StringVar()
        self.limit_amount = tk.StringVar()
        self.goal_scope = tk.StringVar(value="household")
        self.goal_name = tk.StringVar()
        self.goal_target = tk.StringVar()
        self.goal_date = tk.StringVar()
        self._build()
        self.refresh()

    def _build(self) -> None:
        self._configure_style()
        outer = ttk.Frame(self, padding=20)
        outer.pack(fill="both", expand=True)
        hero = ttk.Frame(outer, style="Hero.TFrame", padding=(22, 18))
        hero.pack(fill="x", pady=(0, 16))
        ttk.Label(hero, text="KECKTECH  /  PRIVATE FINANCE", style="HeroEyebrow.TLabel").pack(anchor="w")
        ttk.Label(hero, text="Finance & Resource Hub", style="HeroTitle.TLabel").pack(anchor="w", pady=(4, 2))
        ttk.Label(hero, text="Household, homestead and business decisions grounded in source records", style="HeroSub.TLabel").pack(anchor="w")
        controls = ttk.Frame(outer)
        controls.pack(fill="x", pady=(0, 12))
        ttk.Label(controls, text="MONTH", style="Eyebrow.TLabel").pack(side="left")
        ttk.Button(controls, text="‹", width=3, command=lambda: self.change_month(-1)).pack(side="left", padx=(8, 0))
        ttk.Entry(controls, textvariable=self.month, width=10).pack(side="left", padx=(8, 12))
        ttk.Button(controls, text="›", width=3, command=lambda: self.change_month(1)).pack(side="left", padx=(0, 8))
        ttk.Label(controls, text="VIEW", style="Eyebrow.TLabel").pack(side="left", padx=(12, 0))
        scope_picker = ttk.Combobox(
            controls, textvariable=self.scope,
            values=("All", "Personal", "Household", "Homestead business", "Kecktech", "Datacenter"),
            state="readonly", width=20,
        )
        scope_picker.pack(side="left", padx=(8, 12))
        scope_picker.bind("<<ComboboxSelected>>", lambda _event: self.refresh())
        ttk.Button(controls, text="Refresh", command=self.refresh).pack(side="left")
        ttk.Button(controls, text="Back up data", command=self.backup_data).pack(side="right")
        ttk.Button(controls, text="Import budget plan", command=self.import_plan).pack(side="right")

        tabs = ttk.Notebook(outer)
        tabs.pack(fill="both", expand=True)
        tabs.enable_traversal()
        overview = ttk.Frame(tabs, padding=16)
        plan = ttk.Frame(tabs, padding=12)
        transactions = ttk.Frame(tabs, padding=12)
        bills = ttk.Frame(tabs, padding=12)
        insights = ttk.Frame(tabs, padding=12)
        statements = ttk.Frame(tabs, padding=12)
        pantry = ttk.Frame(tabs, padding=12)
        business = ttk.Frame(tabs, padding=12)
        resources = ttk.Frame(tabs, padding=12)
        recurring = ttk.Frame(tabs, padding=12)
        connections = ttk.Frame(tabs, padding=12)
        limits_goals = ttk.Frame(tabs, padding=12)
        balance = ttk.Frame(tabs, padding=16)
        for frame, title in (
            (overview, "Home"), (plan, "Plan"), (recurring, "Recurring"), (transactions, "Activity"),
            (bills, "Bills"), (insights, "Insights"), (statements, "Statements"),
            (pantry, "Food"),
            (business, "Business"),
            (resources, "Resources"),
            (limits_goals, "Goals"), (connections, "Sources"),
            (balance, "Balance"),
        ):
            tabs.add(frame, text=title)

        ttk.Label(overview, text="This month", style="Section.TLabel").pack(anchor="w", pady=(0, 12))
        grid = ttk.Frame(overview)
        grid.pack(anchor="w", fill="x")
        labels = (
            ("Planned income", "planned_income"), ("Planned expenses", "planned_expense"),
            ("Reviewed income", "reviewed_income"), ("Reviewed expenses", "reviewed_expense"),
        )
        for index, (label, key) in enumerate(labels):
            card = ttk.Frame(grid, padding=(20, 16), style="Card.TFrame")
            card.grid(row=index // 2, column=index % 2, sticky="nsew", padx=(0, 12), pady=(0, 12))
            ttk.Label(card, text=label.upper(), style="CardTitle.TLabel").pack(anchor="w")
            ttk.Label(card, textvariable=self.metrics[key], style="CardValue.TLabel").pack(anchor="w", pady=(8, 0))
        grid.columnconfigure(0, weight=1)
        grid.columnconfigure(1, weight=1)
        ttk.Label(overview, textvariable=self.overview_status, style="Section.TLabel").pack(anchor="w", pady=(18, 5))
        ttk.Label(overview, textvariable=self.actual_note, wraplength=900).pack(anchor="w")
        ttk.Label(overview, textvariable=self.bill_status, wraplength=900).pack(anchor="w", pady=(16, 3))
        ttk.Label(overview, textvariable=self.coverage_status, wraplength=900).pack(anchor="w", pady=(3, 0))
        ttk.Label(overview, textvariable=self.inventory_status, wraplength=900).pack(anchor="w", pady=(16, 0))

        self.plan_tree = self._tree(plan, ("Type", "Category", "Line item", "Planned amount"),
                                    (100, 240, 420, 150))

        ttk.Label(recurring, text="Expected bills and income", style="Section.TLabel").pack(anchor="w", pady=(0, 6))
        ttk.Label(recurring, text="Schedules are forecasts. Received bills and account activity remain the evidence for actual amounts.",
                  wraplength=1000).pack(anchor="w", pady=(0, 10))
        schedule_form = ttk.Frame(recurring)
        schedule_form.pack(fill="x", pady=(0, 10))
        fields = (("Type", self.schedule_kind, 10), ("Name", self.schedule_name, 22),
                  ("Amount", self.schedule_amount, 12), ("Frequency", self.schedule_frequency, 12),
                  ("Next date", self.schedule_date, 13), ("Category", self.schedule_category, 18))
        for column, (label, variable, width) in enumerate(fields):
            ttk.Label(schedule_form, text=label).grid(row=0, column=column, sticky="w", padx=(0, 8))
            if label == "Type":
                control = ttk.Combobox(schedule_form, textvariable=variable, values=("bill", "income"), state="readonly", width=width)
            elif label == "Frequency":
                control = ttk.Combobox(schedule_form, textvariable=variable, values=("weekly", "monthly", "annual"), state="readonly", width=width)
            else:
                control = ttk.Entry(schedule_form, textvariable=variable, width=width)
            control.grid(row=1, column=column, sticky="w", padx=(0, 8), pady=(4, 0))
        ttk.Button(schedule_form, text="Add", command=self.add_recurring).grid(row=1, column=len(fields), padx=(4, 0))
        self.schedule_tree = self._tree(recurring, ("Type", "Name", "Amount", "Frequency", "Next date", "Category", "Status"),
                                        (100, 260, 110, 110, 110, 200, 90))
        schedule_actions = ttk.Frame(recurring)
        schedule_actions.pack(fill="x", pady=(10, 0))
        ttk.Button(schedule_actions, text="Pause selected", command=lambda: self.change_schedule(False)).pack(side="left")
        ttk.Button(schedule_actions, text="Resume selected", command=lambda: self.change_schedule(True)).pack(side="left", padx=(8, 0))
        self.tx_tree = self._tree(transactions,
                                  ("Date", "Account", "Description", "Amount", "Posting", "Review", "Type", "Category"),
                                  (100, 130, 300, 110, 100, 110, 120, 170))
        review = ttk.Frame(transactions)
        review.pack(fill="x", pady=(12, 0))
        ttk.Label(review, text="Classify selected transaction").pack(side="left")
        ttk.Combobox(review, textvariable=self.review_type, values=sorted(ECONOMIC_TYPES),
                     state="readonly", width=17).pack(side="left", padx=(10, 8))
        ttk.Label(review, text="Category").pack(side="left", padx=(0, 6))
        ttk.Entry(review, textvariable=self.review_category, width=24).pack(side="left", padx=(0, 8))
        ttk.Button(review, text="Save review", command=self.save_review).pack(side="left")
        self.tx_tree.bind("<<TreeviewSelect>>", self._transaction_selected)

        ttk.Label(bills, text="Received bills are obligations. A linked amount is not proof the biller credited payment.",
                  wraplength=1000).pack(anchor="w", pady=(0, 10))
        self.bill_tree = self._tree(bills,
                                    ("Source", "Bill", "Description", "Amount due", "Linked", "Due date", "Service period"),
                                    (130, 130, 280, 110, 100, 100, 200))
        payment_form = ttk.Frame(bills)
        payment_form.pack(fill="x", pady=(10, 0))
        ttk.Label(payment_form, text="Reviewed account payment this month").pack(side="left")
        self.payment_combo = ttk.Combobox(payment_form, textvariable=self.payment_choice, state="readonly", width=56)
        self.payment_combo.pack(side="left", padx=8)
        ttk.Label(payment_form, text="Amount").pack(side="left")
        ttk.Entry(payment_form, textvariable=self.payment_amount, width=14).pack(side="left", padx=8)
        ttk.Button(payment_form, text="Link payment", command=self.link_payment).pack(side="left")
        ttk.Button(payment_form, text="Remove link", command=self.remove_payment).pack(side="left", padx=(8, 0))
        self.bill_tree.bind("<<TreeviewSelect>>", self._bill_selected)

        ttk.Label(insights, text="Signals to investigate", style="Section.TLabel").pack(anchor="w", pady=(0, 6))
        ttk.Label(insights, text="Based on received bills and reviewed transactions. No projected or realized saving is claimed.",
                  wraplength=1000).pack(anchor="w", pady=(0, 10))
        self.insight_tree = self._tree(insights, ("Signal", "Subject", "Evidence", "What changed"),
                                       (250, 200, 250, 650))
        ttk.Label(insights, textvariable=self.insight_status, wraplength=1000).pack(anchor="w", pady=(8, 0))

        ttk.Label(statements, text="Statement checks", style="Section.TLabel").pack(anchor="w", pady=(0, 6))
        ttk.Label(statements, text="Balances arrive from account statement sources. A zero difference checks arithmetic only; feed completeness still needs verification.",
                  wraplength=1000).pack(anchor="w", pady=(0, 10))
        self.statement_tree = self._tree(statements,
                                          ("Account source", "Statement", "Period", "Opening", "Movement", "Closing", "Difference", "Status"),
                                          (145, 130, 200, 110, 110, 110, 110, 230))
        ttk.Label(statements, textvariable=self.statement_status, wraplength=1000).pack(anchor="w", pady=(8, 0))

        ttk.Label(pantry, text="Household food inventory", style="Section.TLabel").pack(anchor="w", pady=(0, 6))
        ttk.Label(pantry, text="Read-only MarketList pantry snapshots. Inventory quantity is not a grocery expense or a produce sale.",
                  wraplength=1000).pack(anchor="w", pady=(0, 10))
        self.pantry_tree = self._tree(pantry, ("Item", "Quantity", "Unit", "Category", "Expiry", "Household", "Observed"),
                                      (260, 100, 100, 160, 110, 160, 180))
        ttk.Label(pantry, textvariable=self.pantry_status, wraplength=1000).pack(anchor="w", pady=(8, 0))

        ttk.Label(business, text="Booked business records", style="Section.TLabel").pack(anchor="w", pady=(0, 6))
        ttk.Label(business, text="Read-only submitted accounting records. Missing purpose or tax category remains an exception for review.",
                  wraplength=1000).pack(anchor="w", pady=(0, 10))
        self.business_tree = self._tree(
            business, ("Entity", "Date", "Type", "Document", "Counterparty", "Total", "Year-end exception"),
            (160, 100, 150, 150, 240, 110, 280),
        )
        ttk.Label(business, textvariable=self.business_status, wraplength=1000).pack(anchor="w", pady=(8, 0))
        ttk.Button(business, text="Export year-end review", command=self.export_business).pack(anchor="e", pady=(8, 0))

        ttk.Label(resources, text="Energy and resource measurements", style="Section.TLabel").pack(anchor="w", pady=(0, 6))
        ttk.Label(resources, text="Observed and estimated quantities stay separate. Costs remain unavailable until a verified tariff and allocation method exist.",
                  wraplength=1000).pack(anchor="w", pady=(0, 10))
        self.resource_tree = self._tree(resources, ("Owner", "Site", "Metric", "Quantity", "Unit", "Quality"),
                                        (170, 180, 220, 130, 90, 120))
        ttk.Label(resources, textvariable=self.resource_status, wraplength=1000).pack(anchor="w", pady=(8, 0))

        ttk.Label(limits_goals, text="Monthly spending limits", font=("Segoe UI", 12, "bold")).pack(anchor="w")
        limit_form = ttk.Frame(limits_goals)
        limit_form.pack(fill="x", pady=(8, 8))
        ttk.Label(limit_form, text="Category").pack(side="left")
        ttk.Entry(limit_form, textvariable=self.limit_category, width=25).pack(side="left", padx=(6, 12))
        ttk.Label(limit_form, text="Monthly amount").pack(side="left")
        ttk.Entry(limit_form, textvariable=self.limit_amount, width=14).pack(side="left", padx=(6, 12))
        ttk.Button(limit_form, text="Save limit", command=self.save_limit).pack(side="left")
        self.limit_tree = self._tree(limits_goals,
                                     ("Category", "Monthly limit", "Reviewed spending", "Remaining", "Status"),
                                     (260, 140, 150, 140, 170))
        ttk.Label(limits_goals, text="Savings and funding goals", font=("Segoe UI", 12, "bold")).pack(anchor="w", pady=(14, 0))
        ttk.Label(limits_goals, text="Targets are plans. Progress appears only after linked activity is verified.").pack(anchor="w")
        goal_form = ttk.Frame(limits_goals)
        goal_form.pack(fill="x", pady=(8, 8))
        for column, (label, var, width) in enumerate((
            ("Owner", self.goal_scope, 19), ("Goal name", self.goal_name, 25),
            ("Target amount", self.goal_target, 14), ("Target date YYYY-MM-DD", self.goal_date, 19),
        )):
            ttk.Label(goal_form, text=label).grid(row=0, column=column, sticky="w", padx=(0, 8))
            if column == 0:
                field = ttk.Combobox(goal_form, textvariable=var, values=sorted(GOAL_SCOPES),
                                     state="readonly", width=width)
            else:
                field = ttk.Entry(goal_form, textvariable=var, width=width)
            field.grid(row=1, column=column, sticky="w", padx=(0, 8), pady=(4, 0))
        ttk.Button(goal_form, text="Save goal", command=self.save_goal).grid(row=1, column=4)
        self.goal_tree = self._tree(limits_goals,
                                    ("Owner", "Goal", "Target", "Target date", "Verified progress"),
                                    (160, 260, 130, 130, 160))

        ttk.Label(connections,
                  text="A registered source is not proof of a live connection. Sync health appears only after an adapter runs.",
                  wraplength=1000).pack(anchor="w", pady=(0, 10))
        self.connection_tree = self._tree(connections,
                                          ("Source ID", "Scope", "Kind", "Sync state", "Last success"),
                                          (220, 180, 180, 150, 230))
        ttk.Label(connections, textvariable=self.connection_note).pack(anchor="w", pady=(8, 0))

        ttk.Label(balance, text="Compare an account with a closed statement", font=("Segoe UI", 13, "bold")).pack(anchor="w")
        ttk.Label(balance, text="This checks the arithmetic of imported posted rows; it does not certify statement completeness.",
                  wraplength=850).pack(anchor="w", pady=(4, 14))
        inputs = ttk.Frame(balance)
        inputs.pack(anchor="w")
        for index, (label, var) in enumerate((
            ("Account alias", self.reconcile_account), ("Start date YYYY-MM-DD", self.reconcile_start),
            ("End date YYYY-MM-DD", self.reconcile_end), ("Opening balance", self.reconcile_opening),
            ("Closing balance", self.reconcile_closing),
        )):
            ttk.Label(inputs, text=label).grid(row=index, column=0, sticky="w", pady=5)
            ttk.Entry(inputs, textvariable=var, width=28).grid(row=index, column=1, sticky="w", padx=12, pady=5)
        ttk.Button(balance, text="Check balance", command=self.check_balance).pack(anchor="w", pady=(14, 10))
        ttk.Label(balance, textvariable=self.reconcile_result, wraplength=900).pack(anchor="w")

    @staticmethod
    def _tree(parent: ttk.Frame, columns: tuple[str, ...], widths: tuple[int, ...]) -> ttk.Treeview:
        frame = ttk.Frame(parent)
        frame.pack(fill="both", expand=True)
        tree = ttk.Treeview(frame, columns=columns, show="headings", selectmode="browse")
        for name, width in zip(columns, widths):
            tree.heading(name, text=name)
            tree.column(name, width=width, anchor="e" if "amount" in name.lower() else "w")
        scroll = ttk.Scrollbar(frame, orient="vertical", command=tree.yview)
        tree.configure(yscrollcommand=scroll.set)
        tree.pack(side="left", fill="both", expand=True)
        scroll.pack(side="right", fill="y")
        return tree

    def _configure_style(self) -> None:
        style = ttk.Style(self)
        style.theme_use("clam")
        canvas, navy, accent, ink, muted = "#F3F6FA", "#13243B", "#087F8C", "#14273E", "#53677C"
        self.configure(background=canvas)
        style.configure("TFrame", background=canvas)
        style.configure("TLabel", background=canvas, foreground=ink, font=("Segoe UI", 10))
        style.configure("TButton", font=("Segoe UI Semibold", 10), padding=(12, 7),
                        background=accent, foreground="#FFFFFF", borderwidth=0)
        style.map("TButton", background=[("active", "#096C76"), ("disabled", "#B7C3CE")])
        style.configure("TEntry", padding=6, fieldbackground="#FFFFFF")
        style.configure("TCombobox", padding=5, fieldbackground="#FFFFFF")
        style.configure("TNotebook", background=canvas, borderwidth=0)
        style.configure("TNotebook.Tab", background="#E5ECF3", foreground=ink,
                        font=("Segoe UI Semibold", 10), padding=(15, 10))
        style.map("TNotebook.Tab", background=[("selected", "#FFFFFF"), ("active", "#D6E5ED")],
                  foreground=[("selected", accent)])
        style.configure("Treeview", background="#FFFFFF", fieldbackground="#FFFFFF", foreground=ink,
                        rowheight=30, borderwidth=0, font=("Segoe UI", 10))
        style.configure("Treeview.Heading", background="#E5ECF3", foreground=navy,
                        font=("Segoe UI Semibold", 10), padding=(8, 8), borderwidth=0)
        style.map("Treeview", background=[("selected", "#D6F0F2")], foreground=[("selected", ink)])
        style.configure("Hero.TFrame", background=navy)
        style.configure("HeroEyebrow.TLabel", background=navy, foreground="#66D6DD",
                        font=("Segoe UI Semibold", 9))
        style.configure("HeroTitle.TLabel", background=navy, foreground="#FFFFFF",
                        font=("Segoe UI Semibold", 22))
        style.configure("HeroSub.TLabel", background=navy, foreground="#C8D5E2",
                        font=("Segoe UI", 10))
        style.configure("Section.TLabel", background=canvas, foreground=navy,
                        font=("Segoe UI Semibold", 13))
        style.configure("Eyebrow.TLabel", background=canvas, foreground=muted,
                        font=("Segoe UI Semibold", 9))
        style.configure("Card.TFrame", background="#FFFFFF", relief="flat")
        style.configure("CardTitle.TLabel", background="#FFFFFF", foreground=muted,
                        font=("Segoe UI Semibold", 9))
        style.configure("CardValue.TLabel", background="#FFFFFF", foreground=ink,
                        font=("Segoe UI Semibold", 20))

    def refresh(self) -> None:
        try:
            scope = None if self.scope.get() == "All" else self.scope.get().lower().replace(" ", "_")
            view = month_view(self.db, self.month.get().strip(), scope)
            tx = list_transactions(self.db, None, self.month.get().strip(), scope)["transactions"]
            sources = connection_view(self.db, datetime.now(timezone.utc).isoformat(), scope)
            bills_received = bill_view(self.db, scope)
            signals = savings_signals(self.db, self.month.get().strip(), scope)
            statement_checks = [row for row in list_statement_checks(self.db)
                                if scope is None or row["owner_scope"] == scope]
            pantry = pantry_view(self.db) if scope in (None, "household") else {"snapshots": [], "items": []}
            business_records = business_year_view(self.db, int(self.month.get()[:4]), scope)
            resource_data = resource_month_view(self.db, self.month.get().strip(), scope)
            schedules = list_schedules(self.db) if scope in (None, "household") else []
            goals = list_goals(self.db)
        except (InputError, sqlite3.Error, ValueError) as exc:
            messagebox.showerror("Unable to refresh", str(exc), parent=self)
            return
        summary = view["summary"]
        self.metrics["planned_income"].set(dollars(summary["planned_income_cents"]))
        self.metrics["planned_expense"].set(dollars(summary["planned_expense_cents"]))
        has_reviewed = summary["imported_rows"] > summary["unreviewed_rows"]
        self.metrics["reviewed_income"].set(dollars(summary["reviewed_income_cents"]) if has_reviewed else "Not available")
        self.metrics["reviewed_expense"].set(dollars(summary["reviewed_expense_cents"]) if has_reviewed else "Not available")
        self.actual_note.set(
            f"Actuals: {view['actual_state']}. {summary['unreviewed_rows']} posted transaction(s) need review; "
            f"{summary['pending_rows']} pending."
        )
        self.overview_status.set("Review and coverage")
        if not bills_received:
            self.bill_status.set("BILLS  ·  No received bill data. Upcoming obligations are unavailable until bill feeds run.")
        else:
            today = date.today()
            overdue = sum((date.fromisoformat(row["due_date"]) - today).days < 0
                          for row in bills_received if row["linked_cents"] < row["amount_due_cents"])
            due_soon = sum(0 <= (date.fromisoformat(row["due_date"]) - today).days <= 30
                           for row in bills_received if row["linked_cents"] < row["amount_due_cents"])
            self.bill_status.set(
                f"BILLS  ·  {len(bills_received)} received; {overdue} overdue and {due_soon} due within 30 days with an unlinked balance. "
                "Payment status still needs biller confirmation."
            )
        fresh = sum(row["state"] == "fresh" for row in sources)
        self.coverage_status.set(
            "CONNECTIONS  ·  No provider sources registered; live coverage unavailable." if not sources else
            f"CONNECTIONS  ·  {fresh} of {len(sources)} sources currently fresh. "
            "Freshness alone does not prove complete coverage."
        )
        self._clear(self.insight_tree)
        for row in signals:
            self.insight_tree.insert("", "end", values=(
                row["headline"], row["subject"], row["evidence"], row["detail"],
            ))
        self.insight_status.set(
            f"{len(signals)} evidence-backed signal(s) for {self.month.get().strip()}." if signals else
            "No qualifying signals from current data. This does not mean no savings opportunities exist."
        )
        self._clear(self.statement_tree)
        for row in statement_checks:
            self.statement_tree.insert("", "end", values=(
                row["source_id"], row["statement_id"],
                f"{row['period_start']} to {row['period_end']}",
                dollars(row["opening_cents"]), dollars(row["posted_movement_cents"]),
                dollars(row["closing_cents"]), dollars(row["difference_cents"]),
                row["status"].replace("_", " ").capitalize(),
            ))
        self.statement_status.set(
            f"{len(statement_checks)} source statement(s) recorded. Review any differences and unreviewed entries." if statement_checks else
            "No source statements received. Account reconciliation is unavailable."
        )
        self._clear(self.pantry_tree)
        for row in pantry["items"]:
            self.pantry_tree.insert("", "end", values=(
                row["name"], row["quantity"], row["unit"], row["category"] or "—",
                row["expiry_date"] or "Not supplied", row["household_id"], row["observed_at"],
            ))
        if not pantry["snapshots"]:
            self.pantry_status.set("No MarketList pantry snapshot received. Inventory is unavailable.")
            self.inventory_status.set("FOOD  ·  MarketList pantry data unavailable.")
        else:
            today = date.today()
            expiring = sum(row["expiry_date"] is not None and
                           0 <= (date.fromisoformat(row["expiry_date"]) - today).days <= 7
                           for row in pantry["items"])
            self.pantry_status.set(
                f"{len(pantry['items'])} item(s) from {len(pantry['snapshots'])} household snapshot(s); "
                f"{expiring} expire within seven days. Confirm source freshness before relying on quantities."
            )
            self.inventory_status.set(f"FOOD  ·  {expiring} pantry item(s) expire within seven days; see Food & pantry.")
        self._clear(self.business_tree)
        for row in business_records["documents"]:
            self.business_tree.insert("", "end", values=(
                row["owner_scope"].replace("_", " ").title(), row["posting_date"],
                row["document_type"].replace("_", " ").title(), row["document_id"],
                row["counterparty"], dollars(row["total_cents"]), row["exception"] or "Ready for accountant review",
            ))
        self.business_status.set(
            f"{len(business_records['documents'])} submitted record(s) for {business_records['year']}; "
            f"{business_records['exception_count']} require missing tax details. Accountant review is still required."
            if business_records["documents"] else
            f"No submitted business records for {business_records['year']}. ERPNext data is unavailable."
        )
        self._clear(self.resource_tree)
        for row in resource_data["totals"]:
            self.resource_tree.insert("", "end", values=(
                row["owner_scope"].replace("_", " ").title(), row["site"],
                row["metric"].replace("_", " ").title(), row["quantity"], row["unit"],
                row["quality"].title(),
            ))
        self.resource_status.set(
            f"{len(resource_data['measurements'])} interval measurement(s) for {resource_data['month']}; "
            f"{resource_data['boundary_spanning']} cross month boundaries and are excluded from totals. "
            "Financial value unavailable without verified tariffs."
            if resource_data["measurements"] else
            f"No resource measurements for {resource_data['month']}. Solar, geothermal, water and datacenter usage are unavailable."
        )
        self._clear(self.plan_tree)
        for row in view["plan_rows"]:
            plan_type = {
                "expense_plan": "Expense", "debt_payment_plan": "Debt payment plan",
            }.get(row["plan_type"], row["plan_type"])
            self.plan_tree.insert("", "end", values=(plan_type, row["category"], row["item"],
                                                        dollars(row["planned_cents"])))
        self._clear(self.schedule_tree)
        self.schedule_rows = {}
        for row in schedules:
            key = str(row["id"])
            self.schedule_rows[key] = row
            self.schedule_tree.insert("", "end", iid=key, values=(
                row["kind"].title(), row["name"], dollars(row["amount_cents"]),
                row["frequency"].title(), row["next_date"], row["category"],
                "Active" if row["active"] else "Paused",
            ))
        self._clear(self.tx_tree)
        self.tx_rows = {}
        for row in tx:
            key = f"{row['import_id']}:{row['source_row']}"
            self.tx_rows[key] = row
            self.tx_tree.insert("", "end", iid=key, values=(
                row["posted_date"], row["account"], row["description"], dollars(row["amount_cents"]),
                row["posting_status"], row["review_status"], row["economic_type"] or "",
                row["category"] or "",
            ))
        self._clear(self.connection_tree)
        self._clear(self.bill_tree)
        self.payment_options = {}
        self.payment_combo.configure(values=[])
        self.payment_choice.set("")
        self.bill_rows = {}
        for row in bills_received:
            key = f"{row['source_id']}:{row['bill_id']}"
            self.bill_rows[key] = row
            period = (f"{row['service_start']} to {row['service_end']}"
                      if row["service_start"] else "Not supplied")
            self.bill_tree.insert("", "end", iid=key, values=(
                row["source_id"], row["bill_id"], row["description"],
                dollars(row["amount_due_cents"]), dollars(row["linked_cents"]), row["due_date"], period,
            ))
        for row in sources:
            self.connection_tree.insert("", "end", values=(
                row["source_id"], row["owner_scope"].replace("_", " ").title(),
                row["source_kind"].replace("_", " ").title(),
                row["state"].replace("_", " ").capitalize(), row["last_success_at"] or "Never",
            ))
        self.connection_note.set(
            "No source records yet; no live accounts or billers are connected." if not sources else
            "Source health reflects recorded sync attempts; verify each provider adapter before relying on it."
        )
        self._clear(self.limit_tree)
        for row in summary["spending_limits"]:
            status = ("Over limit" if row["remaining_cents"] < 0 else
                      "Partial—review needed" if summary["unreviewed_rows"] else "Within reviewed limit")
            self.limit_tree.insert("", "end", values=(
                row["category"], dollars(row["limit_cents"]), dollars(row["reviewed_spending_cents"]),
                dollars(row["remaining_cents"]), status,
            ))
        self._clear(self.goal_tree)
        for row in goals:
            if scope is not None and row["owner_scope"] != scope:
                continue
            self.goal_tree.insert("", "end", values=(
                row["owner_scope"].replace("_", " ").title(), row["name"], dollars(row["target_cents"]),
                row["target_date"], "Not available",
            ))

    @staticmethod
    def _clear(tree: ttk.Treeview) -> None:
        for item in tree.get_children():
            tree.delete(item)

    def change_month(self, offset: int) -> None:
        try:
            current = datetime.strptime(self.month.get().strip(), "%Y-%m")
        except ValueError:
            messagebox.showerror("Invalid month", "Enter a month as YYYY-MM.", parent=self)
            return
        month_number = current.year * 12 + current.month - 1 + offset
        self.month.set(f"{month_number // 12:04d}-{month_number % 12 + 1:02d}")
        self.refresh()

    def _transaction_selected(self, _event=None) -> None:
        selected = self.tx_tree.selection()
        if not selected or selected[0] not in self.tx_rows:
            return
        row = self.tx_rows[selected[0]]
        self.review_type.set(row["economic_type"] or "")
        self.review_category.set(row["category"] or "")

    def import_plan(self) -> None:
        path = filedialog.askopenfilename(parent=self, title="Select budget plan workbook",
                                          filetypes=[("Excel workbook", "*.xlsx")])
        if not path:
            return
        try:
            result = import_budget(self.db, path)
        except (InputError, OSError, sqlite3.Error) as exc:
            messagebox.showerror("Plan import failed", str(exc), parent=self)
            return
        messagebox.showinfo("Budget plan", f"{result['status'].replace('_', ' ').capitalize()}: {result['rows']} line(s).",
                            parent=self)
        self.refresh()

    def backup_data(self) -> None:
        path = filedialog.asksaveasfilename(
            parent=self, title="Back up private finance data", defaultextension=".db",
            filetypes=[("Finance database", "*.db")],
            initialfile=f"finance-backup-{date.today().isoformat()}.db",
        )
        if not path:
            return
        try:
            health = database_health(self.db)
            if health["status"] != "ok":
                raise InputError("Current database integrity check failed; backup was not created")
            backup_database(self.db, path)
        except (InputError, OSError, sqlite3.Error) as exc:
            messagebox.showerror("Backup failed", str(exc), parent=self)
            return
        messagebox.showinfo("Backup complete", "Private finance data was copied and verified.", parent=self)

    def save_review(self) -> None:
        selected = self.tx_tree.selection()
        if not selected:
            messagebox.showinfo("Select a transaction", "Choose a transaction first.", parent=self)
            return
        row = self.tx_rows[selected[0]]
        try:
            review_transaction(self.db, row["import_id"], row["source_row"],
                               self.review_type.get(), self.review_category.get())
        except (InputError, sqlite3.Error) as exc:
            messagebox.showerror("Review not saved", str(exc), parent=self)
            return
        self.refresh()

    def add_recurring(self) -> None:
        try:
            add_schedule(self.db, self.schedule_kind.get(), self.schedule_name.get(),
                         self.schedule_amount.get(), self.schedule_frequency.get(),
                         self.schedule_date.get(), self.schedule_category.get())
        except (InputError, sqlite3.Error) as exc:
            messagebox.showerror("Recurring item not saved", str(exc), parent=self)
            return
        self.schedule_name.set("")
        self.schedule_amount.set("")
        self.schedule_date.set("")
        self.schedule_category.set("")
        self.refresh()

    def change_schedule(self, active: bool) -> None:
        selected = self.schedule_tree.selection()
        if not selected:
            messagebox.showinfo("Select recurring item", "Choose a recurring bill or income item first.", parent=self)
            return
        try:
            set_schedule_active(self.db, int(selected[0]), active)
        except (InputError, sqlite3.Error) as exc:
            messagebox.showerror("Recurring item not changed", str(exc), parent=self)
            return
        self.refresh()

    def link_payment(self) -> None:
        selected_bill = self.bill_tree.selection()
        payment = self.payment_options.get(self.payment_choice.get())
        if not selected_bill or payment is None:
            messagebox.showinfo("Select bill and payment", "Choose a bill and a reviewed account payment first.", parent=self)
            return
        bill = self.bill_rows[selected_bill[0]]
        try:
            link_bill_payment(
                self.db, bill_source_id=bill["source_id"], bill_id=bill["bill_id"],
                import_id=payment[0], source_row=payment[1],
                amount=self.payment_amount.get(),
            )
        except (InputError, sqlite3.Error) as exc:
            messagebox.showerror("Payment not linked", str(exc), parent=self)
            return
        self.refresh()

    def remove_payment(self) -> None:
        selected_bill = self.bill_tree.selection()
        payment = self.payment_options.get(self.payment_choice.get())
        if not selected_bill or payment is None:
            messagebox.showinfo("Select bill and payment", "Choose a bill and linked account payment first.", parent=self)
            return
        bill = self.bill_rows[selected_bill[0]]
        try:
            result = unlink_bill_payment(
                self.db, bill_source_id=bill["source_id"], bill_id=bill["bill_id"],
                import_id=payment[0], source_row=payment[1],
            )
        except (InputError, sqlite3.Error) as exc:
            messagebox.showerror("Link not removed", str(exc), parent=self)
            return
        if result["status"] == "absent":
            messagebox.showinfo("No link", "That payment is not linked to the selected bill.", parent=self)
        self.refresh()

    def _bill_selected(self, _event=None) -> None:
        selected = self.bill_tree.selection()
        self.payment_options = {}
        self.payment_combo.configure(values=[])
        self.payment_choice.set("")
        self.payment_amount.set("")
        if not selected or selected[0] not in getattr(self, "bill_rows", {}):
            return
        bill = self.bill_rows[selected[0]]
        try:
            rows = self.db.execute(
                "SELECT t.import_id,t.source_row,t.posted_date,t.account,t.description,t.amount_cents,"
                "COALESCE(l.allocated_cents,0) AS linked_cents "
                "FROM transactions t JOIN feed_transaction_map m "
                "ON m.import_id=t.import_id AND m.source_row=t.source_row "
                "JOIN connection_sources s ON s.source_id=m.source_id "
                "JOIN connection_sources b ON b.source_id=? AND b.owner_scope=s.owner_scope "
                "LEFT JOIN bill_payment_links l ON l.import_id=t.import_id AND l.source_row=t.source_row "
                "AND l.bill_source_id=? AND l.bill_id=? "
                "WHERE t.review_status='reviewed' AND t.economic_type='expense' "
                "AND t.posting_status='posted' AND substr(t.posted_date,1,7)=? "
                "ORDER BY t.posted_date DESC,t.import_id,t.source_row LIMIT 1001",
                (bill["source_id"], bill["source_id"], bill["bill_id"], self.month.get().strip()),
            ).fetchall()
            if len(rows) > 1000:
                raise InputError("More than 1000 reviewed payments this month")
        except (InputError, sqlite3.Error) as exc:
            messagebox.showerror("Payments unavailable", str(exc), parent=self)
            return
        for row in rows:
            label = (f"{row['posted_date']}  {row['account']}  {dollars(-row['amount_cents'])}  "
                     f"{row['description'][:35]}  #{row['import_id']}:{row['source_row']}")
            self.payment_options[label] = (row["import_id"], row["source_row"])
        self.payment_combo.configure(values=list(self.payment_options))

    def save_limit(self) -> None:
        try:
            set_limit(self.db, self.limit_category.get(), self.limit_amount.get())
        except (InputError, sqlite3.Error) as exc:
            messagebox.showerror("Limit not saved", str(exc), parent=self)
            return
        self.refresh()

    def save_goal(self) -> None:
        try:
            set_goal(self.db, self.goal_scope.get(), self.goal_name.get(),
                     self.goal_target.get(), self.goal_date.get())
        except (InputError, sqlite3.Error) as exc:
            messagebox.showerror("Goal not saved", str(exc), parent=self)
            return
        self.refresh()

    def export_business(self) -> None:
        year = int(self.month.get()[:4])
        path = filedialog.asksaveasfilename(
            parent=self, title="Export year-end business review", defaultextension=".csv",
            filetypes=[("CSV review file", "*.csv")], initialfile=f"business-review-{year}.csv",
        )
        if not path:
            return
        try:
            result = export_business_year(self.db, year, path)
        except (InputError, OSError, sqlite3.Error) as exc:
            messagebox.showerror("Business review not exported", str(exc), parent=self)
            return
        messagebox.showinfo(
            "Year-end review exported",
            f"{result['rows']} record(s) exported with {result['exception_count']} exception(s). "
            "This file still requires accountant review and is not labeled tax-ready.", parent=self,
        )

    def check_balance(self) -> None:
        try:
            result = reconcile(
                self.db, self.reconcile_account.get().strip(), self.reconcile_start.get().strip(),
                self.reconcile_end.get().strip(), self.reconcile_opening.get().strip(),
                self.reconcile_closing.get().strip(),
            )
        except (InputError, sqlite3.Error) as exc:
            messagebox.showerror("Balance check failed", str(exc), parent=self)
            return
        self.reconcile_result.set(
            f"{result['status'].replace('_', ' ').capitalize()}; difference {dollars(result['difference_cents'])}. "
            f"{result['transaction_count']} imported posted row(s) in period."
        )

    def close(self) -> None:
        self.db.close()
        self.destroy()


def main() -> None:
    parser = argparse.ArgumentParser(description="Local Finance and Resource Hub screen")
    parser.add_argument("--db", type=Path, default=default_database(),
                        help="Private SQLite file outside the repository")
    args = parser.parse_args()
    target = args.db.expanduser().resolve()
    repo_root = Path(__file__).resolve().parents[2]
    if target == repo_root or repo_root in target.parents:
        parser.error("Finance database must be outside the repository")
    args.db.parent.mkdir(parents=True, exist_ok=True)
    db = open_db(str(args.db))
    init_db(db)
    FinanceApp(db).mainloop()


if __name__ == "__main__":
    main()
