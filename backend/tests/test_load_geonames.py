"""Parsing y reglas de nombres del script de carga de GeoNames (sin red ni base de datos)."""

import pytest

from scripts.load_geonames import (
    AltName,
    City,
    add_spanish_names,
    city_aliases,
    clean_region,
    parse_admin1,
    parse_cities,
    parse_overrides,
    parse_spanish_names,
    pick_admin1_es,
    pick_city_name_es,
)


def geoname_row(gid, name, ascii_name, country, admin1, population):
    """Una fila de citiesNNNN.txt (19 columnas separadas por tab)."""
    cols = [""] * 19
    cols[0], cols[1], cols[2] = str(gid), name, ascii_name
    cols[8], cols[10], cols[14] = country, admin1, str(population)
    return "\t".join(cols) + "\n"


def alt_row(alt_id, gid, lang, name, preferred="", short="", colloquial="", historic=""):
    """Una fila de alternatenames/<CC>.txt (10 columnas)."""
    return (
        "\t".join(
            [str(alt_id), str(gid), lang, name, preferred, short, colloquial, historic, "", ""]
        )
        + "\n"
    )


ADMIN1 = parse_admin1(
    [
        "CL.14\tLos Lagos Region\tLos Lagos Region\t3881974\n",
        "MX.09\tMexico City\tMexico City\t3527646\n",
        "PR.127\tSan Juan\tSan Juan\t4568138\n",
        "BR.22\tRio Grande do Norte\tRio Grande do Norte\t3390290\n",
        "PE.LMA\tLima Province\tLima Province\t3936451\n",
    ]
)


# ---------------------------------------------------------------- parsing
def test_parse_admin1_keeps_name_and_geonameid():
    assert ADMIN1["CL.14"].name == "Los Lagos Region"
    assert ADMIN1["CL.14"].geoname_id == 3881974


def test_parse_cities_filters_countries_and_keeps_puerto_rico_apart():
    lines = [
        geoname_row(3874960, "Puerto Montt", "Puerto Montt", "CL", "14", 245902),
        geoname_row(4568127, "San Juan", "San Juan", "PR", "127", 418140),
        geoname_row(2643743, "London", "London", "GB", "ENG", 8961989),
        "linea rota\n",
    ]
    cities = list(parse_cities(lines, {"CL", "PR", "US"}, ADMIN1))
    assert [(c.name, c.country_code) for c in cities] == [
        ("Puerto Montt", "CL"),
        ("San Juan", "PR"),
    ]
    assert cities[0].admin1 == "Los Lagos Region"
    assert cities[0].admin1_code == "14"
    assert cities[0].admin1_id == 3881974


def test_parse_spanish_names_skips_other_languages_colloquial_and_historic():
    lines = [
        alt_row(1, 3530597, "es", "Ciudad de México", preferred="1"),
        alt_row(2, 3530597, "en", "Mexico City", preferred="1"),
        alt_row(3, 3530597, "es", "El DF", colloquial="1"),
        alt_row(4, 3530597, "es", "Tenochtitlan", historic="1"),
        alt_row(5, 999, "es", "Otra ciudad"),  # no la pedimos
    ]
    names = parse_spanish_names(lines, {3530597})
    assert [a.name for a in names[3530597]] == ["Ciudad de México"]
    assert 999 not in names


# ------------------------------------------------------------------ reglas
def alt(alt_id, name, preferred=False, short=False):
    return AltName(alt_id, name, preferred, short)


def test_city_name_es_only_uses_preferred():
    assert pick_city_name_es([alt(1, "Santiago de Chile")]) is None
    assert pick_city_name_es([alt(2, "México"), alt(1, "Ciudad de México", preferred=True)]) == (
        "Ciudad de México"
    )


def test_admin1_es_prefers_short_then_preferred():
    lagos = [alt(1, "Región de Los Lagos", preferred=True), alt(2, "Los Lagos", short=True)]
    assert pick_admin1_es(lagos) == "Los Lagos"
    assert pick_admin1_es([alt(1, "Región de Los Lagos", preferred=True)]) == "Región de Los Lagos"
    assert pick_admin1_es([alt(1, "Algún nombre")]) is None


def test_aliases_are_unique_and_sorted():
    assert city_aliases([alt(1, "México"), alt(2, "Ciudad de México"), alt(3, "México")]) == (
        "Ciudad de México",
        "México",
    )


@pytest.mark.parametrize(
    ("raw", "clean"),
    [
        ("Lima Province", "Lima"),
        ("Cuzco Department", "Cuzco"),
        ("Los Lagos Region", "Los Lagos"),
        ("Lima region", "Lima"),
        ("Region of Magallanes", "Magallanes"),
        ("  Alajuela Province  ", "Alajuela"),
        ("Antioquia", "Antioquia"),
        ("Region", "Region"),  # no deja el nombre vacío
    ],
)
def test_clean_region(raw, clean):
    assert clean_region(raw) == clean


def test_parse_overrides():
    rows = ["country_code,admin1_code,name\n", "pe,08,Cusco\n", "MX,30,Veracruz\n", "CL,99,\n"]
    assert parse_overrides(rows) == {("PE", "08"): "Cusco", ("MX", "30"): "Veracruz"}


def city(gid, name, country, admin1, admin1_code, admin1_id):
    return City(gid, country, name, name, admin1, 1000, admin1_code, admin1_id)


def test_add_spanish_names_applies_all_rules():
    cities = [
        city(3530597, "Mexico City", "MX", "Mexico City", "09", 3527646),
        city(3874960, "Puerto Montt", "CL", "Los Lagos Region", "14", 3881974),
        city(3936456, "Lima", "PE", "Lima Province", "LMA", 3936451),
        city(3394023, "Natal", "BR", "Rio Grande do Norte", "22", 3390290),
        city(3941584, "Cusco", "PE", "Cuzco Department", "08", 3941583),
    ]
    names = {
        3530597: [alt(1, "Ciudad de México", preferred=True), alt(2, "México")],
        3527646: [alt(3, "Ciudad de México", preferred=True)],
        3881974: [alt(4, "Región de Los Lagos", preferred=True), alt(5, "Los Lagos", short=True)],
        3394023: [alt(6, "Natal", preferred=True)],
        3390290: [alt(7, "Río Grande del Norte", preferred=True)],
    }
    overrides = {("PE", "08"): "Cusco"}
    by_id = {c.id: c for c in add_spanish_names(cities, names, overrides)}

    cdmx = by_id[3530597]
    assert (cdmx.name_es, cdmx.admin1_es) == ("Ciudad de México", "Ciudad de México")
    assert cdmx.aliases == ("Ciudad de México", "México")

    montt = by_id[3874960]
    assert (montt.name_es, montt.admin1_es) == (None, "Los Lagos")  # sin preferido: name

    lima = by_id[3936456]
    assert (lima.name_es, lima.admin1_es) == (None, "Lima")  # sin español: original limpio

    natal = by_id[3394023]  # Brasil queda en portugués, pero con alias para buscar
    assert (natal.name_es, natal.admin1_es) == (None, None)
    assert natal.aliases == ("Natal",)

    assert by_id[3941584].admin1_es == "Cusco"  # override


def test_region_equal_to_original_is_stored_as_null():
    c = city(1, "Antioquia town", "CO", "Antioquia", "02", 2)
    assert add_spanish_names([c], {})[0].admin1_es is None
