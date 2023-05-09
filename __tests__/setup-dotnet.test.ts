import * as core from '@actions/core';
import fs from 'fs';
import semver from 'semver';
import * as auth from '../src/authutil';

import * as setup from '../src/setup-dotnet';
import {DotnetCoreInstaller} from '../src/installer';

describe('setup-dotnet tests', () => {
  const inputs = {} as any;

  const getInputSpy = jest.spyOn(core, 'getInput');
  const getMultilineInputSpy = jest.spyOn(core, 'getMultilineInput');
  const setFailedSpy = jest.spyOn(core, 'setFailed');
  const debugSpy = jest.spyOn(core, 'debug');
  const infoSpy = jest.spyOn(core, 'info');
  const setOutputSpy = jest.spyOn(core, 'setOutput');

  const existsSyncSpy = jest.spyOn(fs, 'existsSync');

  const maxSatisfyingSpy = jest.spyOn(semver, 'maxSatisfying');

  const installDotnetSpy = jest.spyOn(
    DotnetCoreInstaller.prototype,
    'installDotnet'
  );
  const addToPathSpy = jest.spyOn(DotnetCoreInstaller, 'addToPath');

  const configAuthenticationSpy = jest.spyOn(auth, 'configAuthentication');

  describe('run() tests', () => {
    beforeEach(() => {
      getMultilineInputSpy.mockImplementation(input => inputs[input as string]);
      getInputSpy.mockImplementation(input => inputs[input as string]);
    });

    afterEach(() => {
      jest.clearAllMocks();
      jest.resetAllMocks();
    });

    it('should fail the action if global-json-file input is present, but the file does not exist in the file system', async () => {
      inputs['global-json-file'] = 'fictious.json';
      inputs['dotnet-version'] = [];

      const expectedErrorMessage = `The specified global.json file '${inputs['global-json-file']}' does not exist`;

      await setup.run();
      expect(setFailedSpy).toHaveBeenCalledWith(expectedErrorMessage);
    });

    it('should log message into debug output, try to find global.json in the repo root, fail and log message into info output if the dotnet-version and global-json-file inputs are not present', async () => {
      inputs['global-json-file'] = '';
      inputs['dotnet-version'] = [];

      maxSatisfyingSpy.mockImplementation(() => null);
      setOutputSpy.mockImplementation(() => {});

      const expectedDebugMessage =
        'No version found, trying to find version from global.json';
      const expectedInfoMessage = `global.json wasn't found in the root directory. No .NET version will be installed.`;

      await setup.run();

      expect(debugSpy).toHaveBeenCalledWith(expectedDebugMessage);
      expect(existsSyncSpy).toHaveBeenCalled();
      expect(infoSpy).toHaveBeenCalledWith(expectedInfoMessage);
    });

    it('should fail the action if quality is supplied but its value is not supported', async () => {
      inputs['global-json-file'] = '';
      inputs['dotnet-version'] = ['6.0'];
      inputs['dotnet-quality'] = 'fictiousQuality';

      const expectedErrorMessage = `${inputs['dotnet-quality']} is not a supported value for 'dotnet-quality' option. Supported values are: daily, signed, validated, preview, ga.`;

      await setup.run();
      expect(setFailedSpy).toHaveBeenCalledWith(expectedErrorMessage);
    });

    it('should call installDotnet() multiple times if dotnet-version multiline input is provided', async () => {
      inputs['global-json-file'] = '';
      inputs['dotnet-version'] = ['6.0', '7.0'];
      inputs['dotnet-quality'] = '';

      installDotnetSpy.mockImplementation(() => Promise.resolve(''));

      await setup.run();
      expect(installDotnetSpy).toHaveBeenCalledTimes(2);
    });

    it('should call addToPath() after installation complete', async () => {
      inputs['global-json-file'] = '';
      inputs['dotnet-version'] = ['6.0', '7.0'];
      inputs['dotnet-quality'] = '';

      installDotnetSpy.mockImplementation(() => Promise.resolve(''));
      addToPathSpy.mockImplementation(() => {});

      await setup.run();
      expect(addToPathSpy).toHaveBeenCalledTimes(1);
    });

    it('should call auth.configAuthentication() if source-url input is provided', async () => {
      inputs['global-json-file'] = '';
      inputs['dotnet-version'] = [];
      inputs['dotnet-quality'] = '';
      inputs['source-url'] = 'fictious.source.url';

      configAuthenticationSpy.mockImplementation(() => {});

      await setup.run();
      expect(configAuthenticationSpy).toHaveBeenCalledWith(
        inputs['source-url'],
        undefined
      );
    });

    it('should call auth.configAuthentication() with proper parameters if source-url and config-file inputs are provided', async () => {
      inputs['global-json-file'] = '';
      inputs['dotnet-version'] = [];
      inputs['dotnet-quality'] = '';
      inputs['source-url'] = 'fictious.source.url';
      inputs['config-file'] = 'fictious.path';

      configAuthenticationSpy.mockImplementation(() => {});
      setOutputSpy.mockImplementation(() => {});

      await setup.run();
      expect(configAuthenticationSpy).toHaveBeenCalledWith(
        inputs['source-url'],
        inputs['config-file']
      );
    });

    it('should call setOutput() after installation complete', async () => {
      inputs['dotnet-version'] = ['6.0.300'];

      installDotnetSpy.mockImplementation(() => Promise.resolve(''));
      addToPathSpy.mockImplementation(() => {});

      await setup.run();
      expect(setOutputSpy).toHaveBeenCalledTimes(1);
    });
  });
});
