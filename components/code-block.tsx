'use client';

import { useEffect, useState, useRef } from "react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { ChevronsUpDown, Copy, CopyIcon, Download, Download as DownloadIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { solarizedlight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";

import styles from "./code-block.module.css";

import hljs from 'highlight.js/lib/core';

import abnf from 'highlight.js/lib/languages/abnf';
import accesslog from 'highlight.js/lib/languages/accesslog';
import actionscript from 'highlight.js/lib/languages/actionscript';
import ada from 'highlight.js/lib/languages/ada';
import angelscript from 'highlight.js/lib/languages/angelscript';
import apache from 'highlight.js/lib/languages/apache';
import applescript from 'highlight.js/lib/languages/applescript';
import arcade from 'highlight.js/lib/languages/arcade';
import arduino from 'highlight.js/lib/languages/arduino';
import armasm from 'highlight.js/lib/languages/armasm';
import asciidoc from 'highlight.js/lib/languages/asciidoc';
import aspectj from 'highlight.js/lib/languages/aspectj';
import autohotkey from 'highlight.js/lib/languages/autohotkey';
import autoit from 'highlight.js/lib/languages/autoit';
import avrasm from 'highlight.js/lib/languages/avrasm';
import awk from 'highlight.js/lib/languages/awk';
import axapta from 'highlight.js/lib/languages/axapta';
import bash from 'highlight.js/lib/languages/bash';
import basic from 'highlight.js/lib/languages/basic';
import bnf from 'highlight.js/lib/languages/bnf';
import brainfuck from 'highlight.js/lib/languages/brainfuck';
import c from 'highlight.js/lib/languages/c';
import cal from 'highlight.js/lib/languages/capnproto';
import ceylon from 'highlight.js/lib/languages/ceylon';
import clean from 'highlight.js/lib/languages/clean';
import clojure from 'highlight.js/lib/languages/clojure';
import cmake from 'highlight.js/lib/languages/cmake';
import coffeescript from 'highlight.js/lib/languages/coffeescript';
import coq from 'highlight.js/lib/languages/coq';
import cos from 'highlight.js/lib/languages/cos';
import cpp from 'highlight.js/lib/languages/cpp';
import crmsh from 'highlight.js/lib/languages/crmsh';
import crystal from 'highlight.js/lib/languages/crystal';
import csharp from 'highlight.js/lib/languages/csharp';
import csp from 'highlight.js/lib/languages/csp';
import css from 'highlight.js/lib/languages/css';
import d from 'highlight.js/lib/languages/d';
import dart from 'highlight.js/lib/languages/dart';
import delphi from 'highlight.js/lib/languages/delphi';
import diff from 'highlight.js/lib/languages/diff';
import django from 'highlight.js/lib/languages/django';
import dns from 'highlight.js/lib/languages/dns';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import dos from 'highlight.js/lib/languages/dos';
import dsconfig from 'highlight.js/lib/languages/dsconfig';
import dts from 'highlight.js/lib/languages/dts';
import dust from 'highlight.js/lib/languages/dust';
import ebnf from 'highlight.js/lib/languages/ebnf';
import elixir from 'highlight.js/lib/languages/elixir';
import elm from 'highlight.js/lib/languages/elm';
import erb from 'highlight.js/lib/languages/erb';
import erlang from 'highlight.js/lib/languages/erlang';
import excel from 'highlight.js/lib/languages/excel';
import fix from 'highlight.js/lib/languages/fix';
import flix from 'highlight.js/lib/languages/flix';
import fortran from 'highlight.js/lib/languages/fortran';
import fsharp from 'highlight.js/lib/languages/fsharp';
import gams from 'highlight.js/lib/languages/gams';
import gauss from 'highlight.js/lib/languages/gauss';
import gcode from 'highlight.js/lib/languages/gcode';
import gherkin from 'highlight.js/lib/languages/gherkin';
import glsl from 'highlight.js/lib/languages/glsl';
import gml from 'highlight.js/lib/languages/gml';
import go from 'highlight.js/lib/languages/go';
import golo from 'highlight.js/lib/languages/golo';
import gradle from 'highlight.js/lib/languages/gradle';
import graphql from 'highlight.js/lib/languages/graphql';
import groovy from 'highlight.js/lib/languages/groovy';
import haml from 'highlight.js/lib/languages/haml';
import handlebars from 'highlight.js/lib/languages/handlebars';
import haskell from 'highlight.js/lib/languages/haskell';
import haxe from 'highlight.js/lib/languages/haxe';
import hsp from 'highlight.js/lib/languages/hsp';
import http from 'highlight.js/lib/languages/http';
import hy from 'highlight.js/lib/languages/hy';
import inform7 from 'highlight.js/lib/languages/inform7';
import ini from 'highlight.js/lib/languages/ini';
import irpf90 from 'highlight.js/lib/languages/irpf90';
import isbl from 'highlight.js/lib/languages/isbl';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import julia from 'highlight.js/lib/languages/julia';
import kotlin from 'highlight.js/lib/languages/kotlin';
import lasso from 'highlight.js/lib/languages/lasso';
import latex from 'highlight.js/lib/languages/latex';
import ldif from 'highlight.js/lib/languages/ldif';
import leaf from 'highlight.js/lib/languages/leaf';
import less from 'highlight.js/lib/languages/less';
import lisp from 'highlight.js/lib/languages/lisp';
import livecodeserver from 'highlight.js/lib/languages/livecodeserver';
import livescript from 'highlight.js/lib/languages/livescript';
import llvm from 'highlight.js/lib/languages/llvm';
import lsl from 'highlight.js/lib/languages/lsl';
import lua from 'highlight.js/lib/languages/lua';
import makefile from 'highlight.js/lib/languages/makefile';
import markdown from 'highlight.js/lib/languages/markdown';
import mathematica from 'highlight.js/lib/languages/mathematica';
import matlab from 'highlight.js/lib/languages/matlab';
import maxima from 'highlight.js/lib/languages/maxima';
import mel from 'highlight.js/lib/languages/mel';
import mercury from 'highlight.js/lib/languages/mercury';
import mipsasm from 'highlight.js/lib/languages/mipsasm';
import mizar from 'highlight.js/lib/languages/mizar';
import perl from 'highlight.js/lib/languages/perl';
import mojolicious from 'highlight.js/lib/languages/mojolicious';
import monkey from 'highlight.js/lib/languages/monkey';
import moonscript from 'highlight.js/lib/languages/moonscript';
import n1ql from 'highlight.js/lib/languages/n1ql';
import nestedtext from 'highlight.js/lib/languages/nestedtext';
import nginx from 'highlight.js/lib/languages/nginx';
import nim from 'highlight.js/lib/languages/nim';
import nix from 'highlight.js/lib/languages/nix';
import nsis from 'highlight.js/lib/languages/nsis';
import objectivec from 'highlight.js/lib/languages/objectivec';
import ocaml from 'highlight.js/lib/languages/ocaml';
import openscad from 'highlight.js/lib/languages/openscad';
import oxygene from 'highlight.js/lib/languages/oxygene';
import parser3 from 'highlight.js/lib/languages/parser3';
import pf from 'highlight.js/lib/languages/pf';
import pgsql from 'highlight.js/lib/languages/pgsql';
import php from 'highlight.js/lib/languages/php';
import plaintext from 'highlight.js/lib/languages/plaintext';
import pony from 'highlight.js/lib/languages/pony';
import powershell from 'highlight.js/lib/languages/powershell';
import processing from 'highlight.js/lib/languages/processing';
import profile from 'highlight.js/lib/languages/profile';
import prolog from 'highlight.js/lib/languages/prolog';
import properties from 'highlight.js/lib/languages/properties';
import protobuf from 'highlight.js/lib/languages/protobuf';
import puppet from 'highlight.js/lib/languages/puppet';
import purebasic from 'highlight.js/lib/languages/purebasic';
import python from 'highlight.js/lib/languages/python';
import q from 'highlight.js/lib/languages/q';
import qml from 'highlight.js/lib/languages/qml';
import r from 'highlight.js/lib/languages/r';
import reasonml from 'highlight.js/lib/languages/reasonml';
import rib from 'highlight.js/lib/languages/rib';
import roboconf from 'highlight.js/lib/languages/roboconf';
import routeros from 'highlight.js/lib/languages/routeros';
import rsl from 'highlight.js/lib/languages/rsl';
import ruby from 'highlight.js/lib/languages/ruby';
import ruleslanguage from 'highlight.js/lib/languages/ruleslanguage';
import rust from 'highlight.js/lib/languages/rust';
import sas from 'highlight.js/lib/languages/sas';
import scala from 'highlight.js/lib/languages/scala';
import scheme from 'highlight.js/lib/languages/scheme';
import scilab from 'highlight.js/lib/languages/scilab';
import scss from 'highlight.js/lib/languages/scss';
import shell from 'highlight.js/lib/languages/shell';
import smali from 'highlight.js/lib/languages/smali';
import smalltalk from 'highlight.js/lib/languages/smalltalk';
import sml from 'highlight.js/lib/languages/sml';
import sqf from 'highlight.js/lib/languages/sqf';
import sql from 'highlight.js/lib/languages/sql';
import stan from 'highlight.js/lib/languages/stan';
import stata from 'highlight.js/lib/languages/stata';
import step21 from 'highlight.js/lib/languages/step21';
import stylus from 'highlight.js/lib/languages/stylus';
import subunit from 'highlight.js/lib/languages/subunit';
import swift from 'highlight.js/lib/languages/swift';
import taggerscript from 'highlight.js/lib/languages/taggerscript';
import yaml from 'highlight.js/lib/languages/yaml';
import tap from 'highlight.js/lib/languages/tap';
import tcl from 'highlight.js/lib/languages/tcl';
import thrift from 'highlight.js/lib/languages/thrift';
import tp from 'highlight.js/lib/languages/tp';
import twig from 'highlight.js/lib/languages/twig';
import typescript from 'highlight.js/lib/languages/typescript';
import vala from 'highlight.js/lib/languages/vala';
import vbnet from 'highlight.js/lib/languages/vbnet';
import vbscript from 'highlight.js/lib/languages/vbscript';
import verilog from 'highlight.js/lib/languages/verilog';
import vhdl from 'highlight.js/lib/languages/vhdl';
import vim from 'highlight.js/lib/languages/vim';
import wasm from 'highlight.js/lib/languages/wasm';
import wren from 'highlight.js/lib/languages/wren';
import x86asm from 'highlight.js/lib/languages/x86asm';
import xl from 'highlight.js/lib/languages/xl';
import xml from 'highlight.js/lib/languages/xml';
import xquery from 'highlight.js/lib/languages/xquery';
import zephir from 'highlight.js/lib/languages/zephir';
import { toast } from "sonner";

hljs.registerLanguage('abnf', abnf);
hljs.registerLanguage('accesslog', accesslog);
hljs.registerLanguage('actionscript', actionscript);
hljs.registerLanguage('ada', ada);
hljs.registerLanguage('angelscript', angelscript);
hljs.registerLanguage('apache', apache);
hljs.registerLanguage('applescript', applescript);
hljs.registerLanguage('arcade', arcade);
hljs.registerLanguage('arduino', arduino);
hljs.registerLanguage('armasm', armasm);
hljs.registerLanguage('asciidoc', asciidoc);
hljs.registerLanguage('aspectj', aspectj);
hljs.registerLanguage('autohotkey', autohotkey);
hljs.registerLanguage('autoit', autoit);
hljs.registerLanguage('avrasm', avrasm);
hljs.registerLanguage('awk', awk);
hljs.registerLanguage('axapta', axapta);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('basic', basic);
hljs.registerLanguage('bnf', bnf);
hljs.registerLanguage('brainfuck', brainfuck);
hljs.registerLanguage('c', c);
hljs.registerLanguage('cal', cal);
hljs.registerLanguage('ceylon', ceylon);
hljs.registerLanguage('clean', clean);
hljs.registerLanguage('clojure', clojure);
hljs.registerLanguage('cmake', cmake);
hljs.registerLanguage('coffeescript', coffeescript);
hljs.registerLanguage('coq', coq);
hljs.registerLanguage('cos', cos);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('crmsh', crmsh);
hljs.registerLanguage('crystal', crystal);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('csp', csp);
hljs.registerLanguage('css', css);
hljs.registerLanguage('d', d);
hljs.registerLanguage('dart', dart);
hljs.registerLanguage('delphi', delphi);
hljs.registerLanguage('diff', diff);
hljs.registerLanguage('django', django);
hljs.registerLanguage('dns', dns);
hljs.registerLanguage('dockerfile', dockerfile);
hljs.registerLanguage('dos', dos);
hljs.registerLanguage('dsconfig', dsconfig);
hljs.registerLanguage('dts', dts);
hljs.registerLanguage('dust', dust);
hljs.registerLanguage('ebnf', ebnf);
hljs.registerLanguage('elixir', elixir);
hljs.registerLanguage('elm', elm);
hljs.registerLanguage('erb', erb);
hljs.registerLanguage('erlang', erlang);
hljs.registerLanguage('excel', excel);
hljs.registerLanguage('fix', fix);
hljs.registerLanguage('flix', flix);
hljs.registerLanguage('fortran', fortran);
hljs.registerLanguage('fsharp', fsharp);
hljs.registerLanguage('gams', gams);
hljs.registerLanguage('gauss', gauss);
hljs.registerLanguage('gcode', gcode);
hljs.registerLanguage('gherkin', gherkin);
hljs.registerLanguage('glsl', glsl);
hljs.registerLanguage('gml', gml);
hljs.registerLanguage('go', go);
hljs.registerLanguage('golo', golo);
hljs.registerLanguage('gradle', gradle);
hljs.registerLanguage('graphql', graphql);
hljs.registerLanguage('groovy', groovy);
hljs.registerLanguage('haml', haml);
hljs.registerLanguage('handlebars', handlebars);
hljs.registerLanguage('haskell', haskell);
hljs.registerLanguage('haxe', haxe);
hljs.registerLanguage('hsp', hsp);
hljs.registerLanguage('http', http);
hljs.registerLanguage('hy', hy);
hljs.registerLanguage('inform7', inform7);
hljs.registerLanguage('ini', ini);
hljs.registerLanguage('irpf90', irpf90);
hljs.registerLanguage('isbl', isbl);
hljs.registerLanguage('java', java);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('julia', julia);
hljs.registerLanguage('kotlin', kotlin);
hljs.registerLanguage('lasso', lasso);
hljs.registerLanguage('latex', latex);
hljs.registerLanguage('ldif', ldif);
hljs.registerLanguage('leaf', leaf);
hljs.registerLanguage('less', less);
hljs.registerLanguage('lisp', lisp);
hljs.registerLanguage('livecodeserver', livecodeserver);
hljs.registerLanguage('livescript', livescript);
hljs.registerLanguage('llvm', llvm);
hljs.registerLanguage('lsl', lsl);
hljs.registerLanguage('lua', lua);
hljs.registerLanguage('makefile', makefile);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('mathematica', mathematica);
hljs.registerLanguage('matlab', matlab);
hljs.registerLanguage('maxima', maxima);
hljs.registerLanguage('mel', mel);
hljs.registerLanguage('mercury', mercury);
hljs.registerLanguage('mipsasm', mipsasm);
hljs.registerLanguage('mizar', mizar);
hljs.registerLanguage('perl', perl);
hljs.registerLanguage('mojolicious', mojolicious);
hljs.registerLanguage('monkey', monkey);
hljs.registerLanguage('moonscript', moonscript);
hljs.registerLanguage('n1ql', n1ql);
hljs.registerLanguage('nestedtext', nestedtext);
hljs.registerLanguage('nginx', nginx);
hljs.registerLanguage('nim', nim);
hljs.registerLanguage('nix', nix);
hljs.registerLanguage('nsis', nsis);
hljs.registerLanguage('objectivec', objectivec);
hljs.registerLanguage('ocaml', ocaml);
hljs.registerLanguage('openscad', openscad);
hljs.registerLanguage('oxygene', oxygene);
hljs.registerLanguage('parser3', parser3);
hljs.registerLanguage('pf', pf);
hljs.registerLanguage('pgsql', pgsql);
hljs.registerLanguage('php', php);
hljs.registerLanguage('plaintext', plaintext);
hljs.registerLanguage('pony', pony);
hljs.registerLanguage('powershell', powershell);
hljs.registerLanguage('processing', processing);
hljs.registerLanguage('profile', profile);
hljs.registerLanguage('prolog', prolog);
hljs.registerLanguage('properties', properties);
hljs.registerLanguage('protobuf', protobuf);
hljs.registerLanguage('puppet', puppet);
hljs.registerLanguage('purebasic', purebasic);
hljs.registerLanguage('python', python);
hljs.registerLanguage('q', q);
hljs.registerLanguage('qml', qml);
hljs.registerLanguage('r', r);
hljs.registerLanguage('reasonml', reasonml);
hljs.registerLanguage('rib', rib);
hljs.registerLanguage('roboconf', roboconf);
hljs.registerLanguage('routeros', routeros);
hljs.registerLanguage('rsl', rsl);
hljs.registerLanguage('ruleslanguage', ruleslanguage);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('sas', sas);
hljs.registerLanguage('scala', scala);
hljs.registerLanguage('scheme', scheme);
hljs.registerLanguage('scilab', scilab);
hljs.registerLanguage('scss', scss);
hljs.registerLanguage('shell', shell);
hljs.registerLanguage('smali', smali);
hljs.registerLanguage('smalltalk', smalltalk);
hljs.registerLanguage('sml', sml);
hljs.registerLanguage('sqf', sqf);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('stan', stan);
hljs.registerLanguage('stata', stata);
hljs.registerLanguage('step21', step21);
hljs.registerLanguage('stylus', stylus);
hljs.registerLanguage('subunit', subunit);
hljs.registerLanguage('swift', swift);
hljs.registerLanguage('taggerscript', taggerscript);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('tap', tap);
hljs.registerLanguage('tcl', tcl);
hljs.registerLanguage('thrift', thrift);
hljs.registerLanguage('tp', tp);
hljs.registerLanguage('twig', twig);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('vala', vala);
hljs.registerLanguage('vbnet', vbnet);
hljs.registerLanguage('vbscript', vbscript);
hljs.registerLanguage('verilog', verilog);
hljs.registerLanguage('vhdl', vhdl);
hljs.registerLanguage('vim', vim);
hljs.registerLanguage('wasm', wasm);
hljs.registerLanguage('wren', wren);
hljs.registerLanguage('x86asm', x86asm);
hljs.registerLanguage('xl', xl);
hljs.registerLanguage('xquery', xquery);
hljs.registerLanguage('zephir', zephir);
hljs.registerLanguage('xml', xml);

// Update the theme of the codeblock, add a lot of values, and pass it to the header, enabling users to pick their colors.
/**
 * THESE ARE MOST OF All available theme styles in react-syntax-highlighter:
 * - allyDark
 * - allyLight
 * - agate
 * - anOldHope
 * - androidstudio
 * - arduinoLight
 * - arta
 * - ascetic
 * - atelierCaveDark
 * - atelierCaveLight
 * - atelierDuneDark
 * - atelierDuneLight
 * - atelierEstuaryDark
 * - atelierEstuaryLight
 * - atelierForestDark
 * - atelierForestLight
 * - atelierHeathDark
 * - atelierHeathLight
 * - atelierLakesideDark
 * - atelierLakesideDark
 * - atelierPlateauDark
 * - atelierPlateauLight
 * - atelierSavannaDark
 * - atelierSavannaLight
 * - atelierSeasideDark
 * - atelierSeasideLight
 * - atelierSulphurpoolDark
 * - atelierSulphurpoolLight
 * - atomOneDarkReasonable
 * - atomOneDark
 * - atomOneLight
 * - atomDark
 * - brownPaper
 * - base16AteliersulphurpoolLight
 * - cb
 * - codepenEmbed
 * - colorBrewer
 * - coldarkCold
 * - coldarkDark
 * - coy 
 * - darcula
 * - dark
 * - dracula
 * - darkula
 * - defaultStyle
 * - docco
 * - duotoneDark
 * - duotoneEarth
 * - duotoneForest
 * - duotoneLight
 * - duotoneSea
 * - duotoneSpace
 * - far
 * - foundation
 * - funky
 * - github
 * - githubGist
 * - gml
 * - googlecode
 * - gradientDark
 * - grayscale
 * - gruvboxDark
 * - gruvboxLight
 * - ghcolors
 * - hopscotch
 * - hybrid
 * - idea
 * - irBlack
 * - isblEditorDark
 * - isblEditorLight
 * - materialDark
 * - materialLight
 * - materialOceanic
 * - nightOwl
 * - nnfx
 * - nnfxDark
 * - nord
 * - okaidia
 * - oneDark
 * - oneLight
 * - ocean
 * - pojoaque
 * - prism
 * - purebasic 
 * - shadesOfPurple
 * - solarizedLight
 * - synthwave84
 * - tomorrow
 * - twilight
 * - railscasts
 * - routeros
 * - rainbow
 * - qtcreatorLight
 * - qtcreatorDark
 * - stackoverflowDark
 * - stackoverflowLight
 * - schoolBook
 * - vsDark
 * - vs
 * - vs2015
 * - vscDarkPlus
 * - xonokai
 * - xcode
 * - xt256
 * - zenburn
 * THERE ARE MORE AND MORE. SO I WANT YOU TO ADD IT TO THE HEADER TO HAVE A THEME COLOR SELECTOR.
 * SO BECAUSE OF HOW LONG IT IS THERE WILL BE PAGINATIONS, SOME WILL BE AVAILABLE ONLY ON LIGHT AND OTHERS ON DARK.
 * SO WE GIVE USERS ABILITY TO CUSTOMIZE THEIR OWN. THAT WAY WE CAN
 */
// Then we pass those values here, But now we group into two, light and dark themes. 
// So users will have a set of themes to choose from in both light and dark mode
// This we would use to update the header, adding themes to the header.

const THEMES = [
  { name: "One Dark", value: oneDark },
  { name: "Dracula", value: dracula },
  { name: "Solarized Light", value: solarizedlight },
];

interface CodeBlockProps {
  node: any;
  inline: boolean;
  className: string;
  children: any;
}

// A list of "languages" that should be treated as plain text diagrams
const DIAGRAM_LANGUAGES = ['plaintext', 'text', 'ascii', 'diagram', 'tree'];

export function CodeBlock({
  node,
  inline,
  className,
  children,
  ...props
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { theme } = useTheme();
  const [themeIndex, setThemeIndex] = useState(0);
  const [showActions, setShowActions] = useState(false); // For kebab/actions
  const [isMobile, setIsMobile] = useState(false);
  const actionsTimeout = useRef<NodeJS.Timeout | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Detect mobile (tailwind md: 768px)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Hide actions on tap outside (mobile)
  useEffect(() => {
    if (!isMobile || !showActions) return;
    const handle = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setShowActions(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [isMobile, showActions]);

  // Set default theme based on next-themes (light/dark)
  useEffect(() => {
    if (theme === "light") setThemeIndex(2); // Solarized Light index
    else setThemeIndex(0); // One Dark for dark/system
  }, [theme]);

  // Extract language from className (e.g., language-js)
  const match = /language-(\w+)/.exec(className || "");
  const codeString = String(children).replace(/\n$/, "");



  // TODO: WIP MOVE ALL CUSTOM ICON SVG TO THE ICONS.TSX FILE AND IMPORT BACK TO FILE.
  // Count code lines for collapse message
  const codeLines = codeString.split('\n').length;

  // Custom SVGs for Copy and Kebab (three dots)
  const CustomCopyIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="stroke-[2] size-4"><rect x="3" y="8" width="13" height="13" rx="4" stroke="currentColor"></rect><path fillRule="evenodd" clipRule="evenodd" d="M13 2.00004L12.8842 2.00002C12.0666 1.99982 11.5094 1.99968 11.0246 2.09611C9.92585 2.31466 8.95982 2.88816 8.25008 3.69274C7.90896 4.07944 7.62676 4.51983 7.41722 5.00004H9.76392C10.189 4.52493 10.7628 4.18736 11.4147 4.05768C11.6802 4.00488 12.0228 4.00004 13 4.00004H14.6C15.7366 4.00004 16.5289 4.00081 17.1458 4.05121C17.7509 4.10066 18.0986 4.19283 18.362 4.32702C18.9265 4.61464 19.3854 5.07358 19.673 5.63807C19.8072 5.90142 19.8994 6.24911 19.9488 6.85428C19.9992 7.47112 20 8.26343 20 9.40004V11C20 11.9773 19.9952 12.3199 19.9424 12.5853C19.8127 13.2373 19.4748 13.8114 19 14.2361V16.5829C20.4795 15.9374 21.5804 14.602 21.9039 12.9755C22.0004 12.4907 22.0002 11.9334 22 11.1158L22 11V9.40004V9.35725C22 8.27346 22 7.3993 21.9422 6.69141C21.8826 5.96256 21.7568 5.32238 21.455 4.73008C20.9757 3.78927 20.2108 3.02437 19.27 2.545C18.6777 2.24322 18.0375 2.1174 17.3086 2.05785C16.6007 2.00002 15.7266 2.00003 14.6428 2.00004L14.6 2.00004H13Z" fill="currentColor"></path></svg>
  );
  const CustomKebabIcon = (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-4"><path d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM12.5 8.625C13.1213 8.625 13.625 8.12132 13.625 7.5C13.625 6.87868 13.1213 6.375 12.5 6.375C11.8787 6.375 11.375 6.87868 11.375 7.5C11.375 8.12132 11.8787 8.625 12.5 8.625Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
  );
   

  // Map detected language to file extension
  const LANGUAGE_EXTENSIONS: Record<string, string[]> = {
    javascript: ["js", "mjs", "cjs"],
    typescript: ["ts", "tsx"],
    python: ["py", "pyw"],
    bash: ["sh"],
    json: ["json"],
    xml: ["xml", "xsd", "xsl", "xslt"],
    css: ["css"],
    markdown: ["md", "markdown"],
    java: ["java"],
    go: ["go"],
    c: ["c", "h"],
    cpp: ["cpp", "hpp", "h", "cc", "cxx"],
    ruby: ["rb"],
    php: ["php"],
    sql: ["sql", "pgsql"],
    text: ["txt"],
    abnf: ["abnf"],
    accesslog: ["log"],
    actionscript: ["as"],
    ada: ["ada", "adb"],
    angelscript: ["as"],
    apache: ["conf"],
    applescript: ["applescript", "scpt"],
    arcade: ["arcade"],
    arduino: ["ino"],
    armasm: ["s"],
    asciidoc: ["adoc", "asciidoc"],
    aspectj: ["aj"],
    autohotkey: ["ahk"],
    autoit: ["au3"],
    avrasm: ["asm"],
    awk: ["awk"],
    axapta: ["xpp"],
    basic: ["bas"],
    bnf: ["bnf"],
    brainfuck: ["b", "bf"],
    cal: ["cal"],
    ceylon: ["ceylon"],
    clean: ["icl", "dcl"],
    clojure: ["clj", "cljs", "cljc"],
    cmake: ["cmake", "CMakeLists.txt"],
    coffeescript: ["coffee"],
    coq: ["v"],
    cos: ["cls"],
    crmsh: ["crm"],
    crystal: ["cr"],
    csharp: ["cs"],
    csp: [],
    d: ["d"],
    dart: ["dart"],
    delphi: ["pas", "dpr"],
    diff: ["diff", "patch"],
    django: ["py", "html"],
    dns: ["zone", "db"],
    dockerfile: ["Dockerfile"],
    dos: ["bat", "cmd"],
    dsconfig: ["dsconfig"],
    dts: ["dts", "dtsi"],
    dust: ["dust"],
    ebnf: ["ebnf"],
    elixir: ["ex", "exs"],
    elm: ["elm"],
    erb: ["erb"],
    erlang: ["erl", "hrl"],
    excel: ["xls", "xlsx", "xlsm"],
    fix: ["fix"],
    flix: ["flix"],
    fortran: ["f", "for", "f90", "f95"],
    fsharp: ["fs", "fsi", "fsx"],
    gams: ["gms"],
    gauss: ["gss"],
    gcode: ["gcode", "nc"],
    gherkin: ["feature"],
    glsl: ["glsl", "vert", "frag"],
    gml: ["gml"],
    golo: ["golo"],
    gradle: ["gradle", "gradle.kts"],
    graphql: ["graphql", "gql"],
    groovy: ["groovy"],
    haml: ["haml"],
    handlebars: ["hbs", "handlebars"],
    haskell: ["hs", "lhs"],
    haxe: ["hx"],
    hsp: ["hsp"],
    http: ["http"],
    hy: ["hy"],
    inform7: ["ni", "i7x"],
    ini: ["ini"],
    irpf90: ["f90"],
    isbl: ["isbl"],
    julia: ["jl"],
    kotlin: ["kt", "kts"],
    lasso: ["lasso"],
    latex: ["tex"],
    ldif: ["ldif"],
    leaf: ["leaf"],
    less: ["less"],
    lisp: ["lisp", "lsp"],
    livecodeserver: [],
    livescript: ["ls"],
    llvm: ["ll"],
    lsl: ["lsl"],
    lua: ["lua"],
    makefile: ["Makefile", "makefile", "mk"],
    mathematica: ["nb", "m"],
    matlab: ["m"],
    maxima: ["mac"],
    mel: ["mel"],
    mercury: ["m", "moo"],
    mipsasm: ["s", "asm"],
    mizar: ["miz"],
    perl: ["pl", "pm"],
    mojolicious: ["pl"],
    monkey: ["monkey"],
    moonscript: ["moon"],
    n1ql: ["n1ql"],
    nestedtext: ["nt"],
    nginx: ["conf"],
    nim: ["nim"],
    nix: ["nix"],
    nsis: ["nsi", "nsh"],
    objectivec: ["m", "mm", "h"],
    ocaml: ["ml", "mli"],
    openscad: ["scad"],
    oxygene: ["oxygene"],
    parser3: ["p"],
    pf: ["conf"],
    pgsql: ["sql", "pgsql"],
    plaintext: ["txt"],
    pony: ["pony"],
    powershell: ["ps1"],
    processing: ["pde"],
    profile: ["conf"],
    prolog: ["pl", "pro"],
    properties: ["properties"],
    protobuf: ["proto"],
    puppet: ["pp"],
    purebasic: ["pb", "pbi"],
    q: ["q"],
    qml: ["qml"],
    r: ["r"],
    reasonml: ["re", "rei"],
    rib: ["rib"],
    roboconf: ["graph", "instances"],
    routeros: ["rsc"],
    rsl: ["rsl"],
    ruleslanguage: ["rules"],
    rust: ["rs"],
    sas: ["sas"],
    scala: ["scala", "sc"],
    scheme: ["scm", "ss"],
    scilab: ["sci", "sce"],
    scss: ["scss"],
    shell: ["sh", "bash"],
    smali: ["smali"],
    smalltalk: ["st"],
    sml: ["sml", "sig"],
    sqf: ["sqf"],
    stan: ["stan"],
    stata: ["do", "ado"],
    step21: ["stp", "step"],
    stylus: ["styl"],
    subunit: [],
    swift: ["swift"],
    taggerscript: ["tag"],
    yaml: ["yaml", "yml"],
    tap: ["t"],
    tcl: ["tcl"],
    thrift: ["thrift"],
    tp: [],
    twig: ["twig"],
    vala: ["vala"],
    vbnet: ["vb"],
    vbscript: ["vbs"],
    verilog: ["v", "sv"],
    vhdl: ["vhd", "vhdl"],
    vim: ["vim"],
    wasm: ["wasm"],
    wren: ["wren"],
    x86asm: ["asm"],
    xl: ["xl"],
    xquery: ["xq", "xquery"],
    zephir: ["zep"],
  };

   // --- THIS IS THE FIX ---
  // Step 1: Extract language explicitly provided (e.g., ```javascript)
  const explicitLangMatch = /language-(\w+)/.exec(className || "");
  const explicitLang = explicitLangMatch ? explicitLangMatch[1].toLowerCase() : null;

  // Step 2: Determine the final language. Use explicit if available, otherwise auto-detect.
  const language = explicitLang || (() => {
    try {
      // Auto-detect only if no language was specified
      const result = hljs.highlightAuto(codeString);
      return result.language || 'plaintext';
    } catch {
      return 'plaintext';
    }
  })();

    // Language auto-detection if not specified
  let detectedLanguage = language;
  if (!detectedLanguage) {
    try {
      const result = hljs.highlightAuto(codeString);
      detectedLanguage = result.language || "text";
    } catch {
      detectedLanguage = "text";
    }
  }
  
  // Step 3: Decide if it's a diagram based on the FINAL language.
  const isDiagram = DIAGRAM_LANGUAGES.includes(language);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy.");
      setCopied(false);
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([codeString], { type: "text/plain" });
      const ext = language === 'plaintext' ? 'txt' : language;
      const filename = `avurna-ai-codeblock.${ext}`;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
       toast.error("Download failed.");
    }
  };

   if (inline) {
    return (
      <code className="relative rounded bg-zinc-200 dark:bg-zinc-700/50 px-[0.4rem] py-[0.2rem] font-mono text-sm break-words">
        {children}
      </code>
    );
  }
  
  const syntaxTheme = theme === 'dark' ? oneDark : solarizedlight;
  const containerBgColor = syntaxTheme.hasOwnProperty('pre[class*="language-"]') 
    // @ts-ignore
    ? String(syntaxTheme['pre[class*="language-"]'].background) 
    : '#2d2d2d';

  return (
    <TooltipProvider>
      <div
        className="not-prose relative my-4 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 overflow-hidden"
        style={{ backgroundColor: containerBgColor }}
      >
        <div className="flex items-center justify-between px-4 py-1.5 bg-black/10">
          <span className="text-xs font-sans text-zinc-400 select-none capitalize">
            {language}
          </span>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={handleCopy} className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
                  <span className="sr-only">Copy code</span>
                  <Copy className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{copied ? 'Copied!' : 'Copy to clipboard'}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={handleDownload} className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
                   <span className="sr-only">Download code</span>
                  <Download className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Download as .{language === 'plaintext' ? 'txt' : language}</TooltipContent>
            </Tooltip>
             <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
                  <span className="sr-only">{collapsed ? 'Expand code' : 'Collapse code'}</span>
                  <ChevronsUpDown className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{collapsed ? `Show ${codeLines} lines` : 'Collapse code'}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className={styles.codeBlockScroll}>
          {!collapsed && (
            isDiagram ? (
              <pre className="p-4 font-mono text-sm leading-relaxed">
                <code>{codeString}</code>
              </pre>
            ) : (
              <SyntaxHighlighter
                language={language}
                style={syntaxTheme}
                showLineNumbers={false}
                wrapLines={false}
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  backgroundColor: 'transparent',
                  fontSize: '14px',
                  lineHeight: '1.5',
                }}
                codeTagProps={{
                  className: "font-mono",
                }}
                {...props}
              >
                {codeString}
              </SyntaxHighlighter>
            )
          )}
        </div>
        
        {collapsed && (
            <div className="italic text-xs text-zinc-500 text-center select-none py-4 border-t border-white/5">
              {codeLines} lines hidden...
            </div>
        )}
      </div>
    </TooltipProvider>
  );
}