"""The taxatie update endpoint interpolates column names into a SET clause.
That is only safe while the names come from a fixed whitelist."""

from api.routes.taxatie import UPDATABLE_REPORT_COLUMNS, UpdateReportRequest


def test_whitelist_matches_the_request_model():
    """If a field is added to the model but not the whitelist it would be
    silently dropped; the reverse would widen the injection surface."""
    assert set(UpdateReportRequest.model_fields) == set(UPDATABLE_REPORT_COLUMNS)


def test_whitelist_contains_no_sql_metacharacters():
    for column in UPDATABLE_REPORT_COLUMNS:
        assert column.replace("_", "").isalnum(), column


def _filter(payload: dict) -> dict:
    """Mirror of the filtering in update_report()."""
    return {
        k: v for k, v in payload.items()
        if v is not None and k in UPDATABLE_REPORT_COLUMNS
    }


def test_unknown_columns_are_dropped():
    hostile = {
        "marktwaarde": 450_000,
        "user_id": 999,                                   # not updatable
        "status": "final",                                # not updatable
        "id = 1; DROP TABLE taxatie_reports; --": "x",    # injection attempt
    }
    assert _filter(hostile) == {"marktwaarde": 450_000}


def test_none_values_are_dropped():
    assert _filter({"marktwaarde": None, "year_built": 1998}) == {"year_built": 1998}


def test_set_clause_is_built_only_from_whitelisted_names():
    fields = _filter({"marktwaarde": 1, "energy_label": "A", "status": "final"})
    set_clause = ", ".join(f"{k} = :{k}" for k in fields)
    assert "status" not in set_clause
    assert set_clause.count("=") == len(fields)
