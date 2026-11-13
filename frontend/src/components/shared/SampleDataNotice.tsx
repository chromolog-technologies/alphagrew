import { useEffect, useState } from 'react';
import { SAMPLE_DATA_EVENT } from '../../api/core';
import { PrototypeNotice } from './PrototypeNotice';

/**
 * Shows the "Prototype screen" notice while the current screen has loaded any response marked
 * `X-Data-Source: sample` (backend MarkSampleData middleware). It resets when `screenKey`
 * changes, so moving to a screen with real data hides it again. This replaces placing the
 * notice by hand on each sample-data screen.
 */
export function SampleDataNotice({ screenKey }: { screenKey: string }) {
  const [sample, setSample] = useState(false);

  useEffect(() => {
    setSample(false);
    const onSample = () => setSample(true);
    window.addEventListener(SAMPLE_DATA_EVENT, onSample);
    return () => window.removeEventListener(SAMPLE_DATA_EVENT, onSample);
  }, [screenKey]);

  return sample ? <PrototypeNotice /> : null;
}
