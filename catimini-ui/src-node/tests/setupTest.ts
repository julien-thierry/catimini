globalThis.IS_REACT_ACT_ENVIRONMENT = true;

import {cleanup} from '@testing-library/react'
import {afterEach} from 'vitest'

afterEach(() => {
    cleanup()
});
