import Logger from "../logger";
import BaseTester from "./base-tester";
import child_process from "child_process";
import Course from "../models/course";
import Language from "../models/language";
import util from "util";
import tmp from "tmp";
import Dockerfile from "../models/dockerfile";

const exec = util.promisify(child_process.exec);
// const writeFile = util.promisify(fs.writeFile);

export default class DockerfileTester extends BaseTester {
  course: Course;
  dockerfile: Dockerfile;
  copiedStarterDir: string | undefined;

  constructor(course: Course, dockerfile: Dockerfile) {
    super();
    this.course = course;
    this.dockerfile = dockerfile;
  }

  get language() {
    return Language.findByLanguagePack(this.dockerfile.languagePack);
  }

  async doTest() {
    this.copiedStarterDir = tmp.dirSync().name;
    await exec(`rm -rf ${this.copiedStarterDir}`);
    await exec(`cp -r ${this.starterDir} ${this.copiedStarterDir}`);

    Logger.logHeader(`Testing Dockerfile: ${this.slug}`);

    Logger.logInfo(`Building ${this.dockerfile.languagePack} image without cache`);
    const timeTaken = await this.assertTimeUnder(400, this.buildImage.bind(this));

    Logger.logInfo(`Took ${timeTaken} secs`);
    Logger.logInfo("");

    Logger.logInfo(`Building ${this.dockerfile.languagePack} image with cache`);
    const timeTakenWithCache = await this.assertTimeUnder(5, this.buildImage.bind(this));

    Logger.logSuccess(`Took ${timeTakenWithCache} secs`);
  }

  async buildImage() {
    const command = `docker build -t ${this.slug} -f ${this.dockerfile.path} ${this.copiedStarterDir}`;
    const expectedOutput = `naming to docker.io/library/${this.slug}`;
    await this.assertStderrContains(command, expectedOutput);
  }

  get slug() {
    return `${this.course.slug}-${this.dockerfile.languagePack}`;
  }

  get starterDir() {
    return `${this.course.compiledStarterRepositoriesDir}/${this.language.slug}`;
  }
}
