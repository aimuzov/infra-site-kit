import type Alert from '@aimuzov/infra-site-kit/ui/alert.svelte'
import type Badge from '@aimuzov/infra-site-kit/ui/badge.svelte'
import type Button from '@aimuzov/infra-site-kit/ui/button.svelte'
import type Card from '@aimuzov/infra-site-kit/ui/card.svelte'
import type ChipButton from '@aimuzov/infra-site-kit/ui/chip-button.svelte'
import type CopyValue from '@aimuzov/infra-site-kit/ui/copy-value.svelte'
import type Dropzone from '@aimuzov/infra-site-kit/ui/dropzone.svelte'
import type Field from '@aimuzov/infra-site-kit/ui/field.svelte'
import type InfoTip from '@aimuzov/infra-site-kit/ui/info-tip.svelte'
import type Input from '@aimuzov/infra-site-kit/ui/input.svelte'
import type LangSwitch from '@aimuzov/infra-site-kit/ui/lang-switch.svelte'
import type PanelToggle from '@aimuzov/infra-site-kit/ui/panel-toggle.svelte'
import type Search from '@aimuzov/infra-site-kit/ui/search.svelte'
import type Skeleton from '@aimuzov/infra-site-kit/ui/skeleton.svelte'
import type ThemeToggle from '@aimuzov/infra-site-kit/ui/theme-toggle.svelte'
import type { Component, ComponentProps } from 'svelte'

import type * as Ui from '../../../site/ui/types.js'

// svelte-check берёт пропсы компонента из последней сигнатуры. Окажись там сигнатура
// для Astro, и пропсы в Svelte-разметке перестают проверяться.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type Same<C extends Component<any, any>, P> = Equal<ComponentProps<C>, P>

export const props = [
	true satisfies Same<typeof Alert, Ui.AlertProps>,
	true satisfies Same<typeof Badge, Ui.BadgeProps>,
	true satisfies Same<typeof Button, Ui.ButtonProps>,
	true satisfies Same<typeof Card, Ui.CardProps>,
	true satisfies Same<typeof ChipButton, Ui.ChipButtonProps>,
	true satisfies Same<typeof CopyValue, Ui.CopyValueProps>,
	true satisfies Same<typeof Dropzone, Ui.DropzoneProps>,
	true satisfies Same<typeof Field, Ui.FieldProps>,
	true satisfies Same<typeof InfoTip, Ui.InfoTipProps>,
	true satisfies Same<typeof Input, Ui.InputProps>,
	true satisfies Same<typeof LangSwitch, Ui.LangSwitchProps>,
	true satisfies Same<typeof PanelToggle, Ui.PanelToggleProps>,
	true satisfies Same<typeof Search, Ui.SearchProps>,
	true satisfies Same<typeof Skeleton, Ui.SkeletonProps>,
	true satisfies Same<typeof ThemeToggle, Ui.ThemeToggleProps>,
]
