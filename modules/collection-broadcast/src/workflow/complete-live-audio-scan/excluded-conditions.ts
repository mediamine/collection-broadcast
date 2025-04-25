export const isCompleteScanExcludedConditions = (link: string) =>
  !/https[^\s]+https[^\s]+/.test(link) && !['www.ensemblemagazine.co.nz', 'sponsoredinteractive.stuff.co.nz'].some((d) => link.includes(d));

// this is to exclude any live programmes being scraped & transcribed
export const isCompleteLiveAudioScanExcludedConditions = (link: string) => link.includes('live');
