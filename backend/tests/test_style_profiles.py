from app.services.style_profiles import get_profile


def test_style_profiles_load():
    styles = ["scandinavian", "minimal", "industrial", "japandi", "mid_century"]
    for s in styles:
        prof = get_profile(s)
        assert prof.id == s
        assert 0.0 <= prof.density <= 1.0
        assert prof.wall_flush_tolerance > 0.0
