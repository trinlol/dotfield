      /** Advance one simulation step (also used by tests on canvas instances) */
      step: function (dt) {
        stepParticles(state, dt == null ? 1 / 60 : dt);
        return api;
      },
      canvas: canvas,
    };


    if (options.autoStart !== false) {
      api.start();
    }
    return api;
  }

  return {
    version: VERSION,
    create: create,
    createSimulation: createSimulation,
    listModes: listModes,
    listCalmModes: listCalmModes,
    getMode: getMode,
    isCalmMode: isCalmModeIdPublic,
    suggestMouseInteraction: suggestMouseInteraction,
    families: FAMILIES.map(function (f) {
      return {
        id: f.id,
        label: f.label,
        description: f.desc,
        engine: f.engine,
        calm: !!f.calm,
      };
    }),
    palettes: Object.keys(PALETTES).concat(["rainbow"]),
    backgrounds: Object.keys(BG),
    // exposed for advanced consumers / tests
    _catalogLength: CATALOG.length,
    _resolveModeId: resolveModeId,
  };
});

